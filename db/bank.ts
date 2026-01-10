import { Schema, InferSchemaType, model } from 'mongoose'

const bankSchema = new Schema({
  id: { type: String, default: 'singleton', unique: true },
  totalStakes: { type: Number, default: 0 },
  totalPayouts: { type: Number, default: 0 },
})

export type Bank = InferSchemaType<typeof bankSchema>
const BankModel = model<Bank>('Bank', bankSchema)

export default BankModel
