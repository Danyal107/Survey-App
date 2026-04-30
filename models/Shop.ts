import mongoose, { Schema, models, model } from "mongoose";

/** Shop profile keyed by respondent field ids (e.g. shopName, market). */
export type IShopDetails = Record<string, string | string[]>;

export interface IShop {
  _id: mongoose.Types.ObjectId;
  details: IShopDetails;
  isDeleted?: boolean;
  createdAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    details: { type: Schema.Types.Mixed, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Shop = models.Shop ?? model<IShop>("Shop", ShopSchema);
