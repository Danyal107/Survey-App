import mongoose, { Schema, models, model } from "mongoose";

export interface IShopCategoryOption {
  label: string;
  requiresAudience: boolean;
}

export interface IShopOptions {
  _id: mongoose.Types.ObjectId;
  key: string;
  markets: string[];
  categories: IShopCategoryOption[];
  updatedAt: Date;
}

const ShopCategoryOptionSchema = new Schema<IShopCategoryOption>(
  {
    label: { type: String, required: true, trim: true },
    requiresAudience: { type: Boolean, default: false },
  },
  { _id: false }
);

const ShopOptionsSchema = new Schema<IShopOptions>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    markets: [{ type: String, trim: true }],
    categories: { type: [ShopCategoryOptionSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ShopOptions =
  models.ShopOptions ?? model<IShopOptions>("ShopOptions", ShopOptionsSchema);
