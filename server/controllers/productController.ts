import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma, Product } from "../generated/prisma/client.js";

// Compute the discount percentage and return the product with it attached
const withDiscount = (p: Product) => {
    const discount = p.originalPrice && p.price
        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
        : 0;
    return { ...p, discount };
};

// Fields a client is allowed to set when creating/updating a product.
// Fields not present in the body are left as `undefined` so Prisma skips them
// on partial updates (rather than overwriting them with NaN/null).
const pickProductData = (body: any): Prisma.ProductUpdateInput => ({
    name: body.name,
    description: body.description,
    price: body.price != null ? Number(body.price) : undefined,
    originalPrice: body.originalPrice != null ? Number(body.originalPrice) : undefined,
    image: body.image,
    category: body.category,
    unit: body.unit,
    stock: body.stock != null ? Number(body.stock) : undefined,
    isOrganic: body.isOrganic,
    rating: body.rating != null ? Number(body.rating) : undefined,
    reviewCount: body.reviewCount != null ? Number(body.reviewCount) : undefined,
});

// GET /api/products/flash-deals
export const getFlashDeals = async (req: Request, res: Response) => {
    const products = await prisma.product.findMany({
        where: { stock: { gt: 0 }, originalPrice: { gt: 0 } },
    });

    const deals = products
        .map(withDiscount)
        .filter((p) => p.discount > 0)
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 8);

    res.json({ products: deals });
};

// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
    const { category, search, minPrice, maxPrice, sort } = req.query;

    const where: Prisma.ProductWhereInput = {};
    if (category && category !== "all") where.category = category as string;
    if (search) where.name = { contains: search as string, mode: "insensitive" };
    if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = Number(minPrice);
        if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sort === "price-low") orderBy.price = "asc";
    else if (sort === "price-high") orderBy.price = "desc";
    else orderBy.createdAt = "desc";

    const products = await prisma.product.findMany({ where, orderBy });

    res.json({ products: products.map(withDiscount) });
};

// GET /api/products/:id
export const getProduct = async (req: Request, res: Response) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id as string } });

    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product: withDiscount(product) });
};

// POST /api/products
export const createProduct = async (req: Request, res: Response) => {
    const { name, price, image, category } = req.body;

    if (!name || price == null || Number.isNaN(Number(price)) || !image || !category) {
        return res.status(400).json({ message: "name, price, image and category are required" });
    }

    const data = pickProductData(req.body) as Prisma.ProductCreateInput;
    const product = await prisma.product.create({ data });
    res.status(201).json({ product });
};

// PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id as string },
            data: pickProductData(req.body),
        });
        res.json({ product });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return res.status(404).json({ message: "Product not found" });
        }
        throw error;
    }
};

// DELETE /api/products/:id  (soft delete — marks the product out of stock)
export const deleteProduct = async (req: Request, res: Response) => {
        await prisma.product.update({
            where: { id: req.params.id as string },
            data: { stock: Number(0) },
        });
        res.json({ message: "Product removed" });
};
