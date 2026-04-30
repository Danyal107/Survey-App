import mongoose, { Schema, models, model } from "mongoose";

/** Shop profile keyed by respondent field ids (e.g. shopName, market). */
export type IShopDetails = Record<string, string | string[]>;

/** WGS84: [latitude, longitude]. */
export type ShopCoordinates = [number, number];

export interface IShop {
  _id: mongoose.Types.ObjectId;
  details: IShopDetails;
  /** Optional map pin as `[lat, lng]`. */
  coordinates?: ShopCoordinates;
  isDeleted?: boolean;
  createdAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    details: { type: Schema.Types.Mixed, required: true },
    coordinates: {
      type: [Number],
      default: undefined,
      validate: {
        validator(v: unknown) {
          if (v == null) return true;
          if (!Array.isArray(v) || v.length !== 2) return false;
          return v.every((x) => typeof x === "number" && Number.isFinite(x));
        },
        message: "coordinates must be [lat, lng]",
      },
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Shop = models.Shop ?? model<IShop>("Shop", ShopSchema);
