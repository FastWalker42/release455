import { Schema, InferSchemaType, model } from 'mongoose'
import { randomUUID } from 'crypto'
import mongoose from 'mongoose'
import { REF_LEVELS } from '../config'

const userSchema = new Schema({
  internalId: { type: String, default: () => randomUUID(), unique: true },
  id: { type: Number, required: true, unique: true }, // Telegram id
  invited_by: { type: Number, default: null },

  name: { type: String, default: null },
  activated: { type: Boolean, default: true },
  state: { type: String, default: 'none' },
  balance: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 }, // Добавлено: общая сумма пополнений
  lastCache: { type: Date, default: Date.now }, // Добавлено: время последнего кэширования
  createdAt: { type: Date, default: Date.now },
  is_admin: { type: Boolean, default: false },
  doGetNotifications: { type: Boolean, default: true },
  appToken: { type: String, default: () => randomUUID(), unique: true },
  profilePhoto: { type: Buffer, required: false },

  gamesPlayed: { type: Number, default: 0 },
  refsCount: { type: Number, default: 0 },
  refTotalMoney: { type: Number, default: 0 },
  refLevel: { type: Number, default: 1, enum: Object.keys(REF_LEVELS).map(Number) },

  invoiceId: { type: Number, default: null },
})

export type User = InferSchemaType<typeof userSchema>
const UserModel = model<User>('User', userSchema)

export default UserModel
