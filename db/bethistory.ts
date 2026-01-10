import { Schema, InferSchemaType, model } from 'mongoose'

const betHistorySchema = new Schema({
  userToken: { type: String, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['won', 'lost'],
  },
  finalCoeff: { type: Number },
  createdAt: { type: Date, default: Date.now },
  gameId: { type: String },
})
betHistorySchema.index({ createdAt: 1 })
betHistorySchema.index({ userToken: 1 })
betHistorySchema.index({ gameId: 1 })

export type BetHistory = InferSchemaType<typeof betHistorySchema>
const BetHistoryModel = model<BetHistory>('BetHistory', betHistorySchema)

export default BetHistoryModel
