import { Schema, InferSchemaType, model } from 'mongoose'
import { nanoid } from 'nanoid'
import mongoose from 'mongoose'
import { REF_LEVELS } from '../config'

const userSchema = new Schema({
  internalId: { type: String, default: () => nanoid(16), unique: true },
  id: { type: Number, required: true, unique: true }, // Telegram id
  invited_by: { type: String, default: null },
  refType: { type: String, default: null },

  name: { type: String, default: null },
  activated: { type: Boolean, default: false },
  activeGiveaway: { type: String, default: null },
  balance: { type: Number, default: 0 },
  freespins: { type: Number, default: 0 },

  freespinClaimed: { type: Date, default: null },

  totalTopup: { type: Number, default: 0 }, // Добавлено: общая сумма пополнений
  totalAmount: { type: Number, default: 0 },
  lastCache: { type: Date, default: Date.now }, // Добавлено: время последнего кэширования
  createdAt: { type: Date, default: Date.now },
  is_admin: { type: Boolean, default: false },
  doGetNotifications: { type: Boolean, default: true },
  appToken: { type: String, default: () => nanoid(32), unique: true },
  profilePhoto: { type: Buffer, required: false },

  gamesPlayed: { type: Number, default: 0 },
  refsCount: { type: Number, default: 0 },
  refTotalMoney: { type: Number, default: 0 },
  refLevel: { type: Number, default: 1, enum: Object.keys(REF_LEVELS).map(Number) },

  invoiceId: { type: Number, default: null },
})
userSchema.index({ createdAt: 1 })
userSchema.index({ invited_by: 1 })

export type UserType = InferSchemaType<typeof userSchema>
const UserModel = model<UserType>('User', userSchema)

export default UserModel
