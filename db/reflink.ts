import { Schema, InferSchemaType, model } from 'mongoose'
import { nanoid } from 'nanoid'

const reflinkSchema = new Schema({
  payload: {
    type: String,
    default: () => nanoid(8),
    unique: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 32,
  },
  giveAway: {
    enabled: { type: Boolean, default: false },
    giftId: { type: String, default: 'none' },
    places: { type: Number, required: false, default: 3 },
    endDate: { type: Date, required: false, default: null },
    channels: { type: [String], required: false, default: [] },
  },

  usersJoined: { type: Number, default: 0 },
  totalDeposits: { type: Number, default: 0 },
  totalLost: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
})

export type Reflink = InferSchemaType<typeof reflinkSchema>
export default model<Reflink>('Reflink', reflinkSchema)
