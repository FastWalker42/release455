import { Schema, InferSchemaType, model } from 'mongoose'

const bankSchema = new Schema({
  id: { type: String, default: 'singleton', unique: true },
  balance: { type: Number, default: 0 },
  totalStakes: { type: Number, default: 0 },
  totalPayouts: { type: Number, default: 0 },
  currentRTP: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
})

export type Bank = InferSchemaType<typeof bankSchema>
const BankModel = model<Bank>('Bank', bankSchema)

export default BankModel
