import { Schema, InferSchemaType, model } from 'mongoose'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const operHistorySchema = new Schema({
  operId: { type: String, default: () => nanoid(16), unique: true },
  userId: { type: Number, required: true },
  operType: {
    type: String,
    enum: ['topup', 'cashout'],
  },
  tonAmount: { type: Number },

  currency: { type: String, required: false },
  currencyAmount: { type: Number, required: false },
  usdAmount: { type: Number, required: true },

  date: { type: Date, default: Date.now },
})

export type OperHistory = InferSchemaType<typeof operHistorySchema>
const OperHistoryModel = model<OperHistory>('OperHistory', operHistorySchema)

export default OperHistoryModel
