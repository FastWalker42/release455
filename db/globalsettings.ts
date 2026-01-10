import { Schema, InferSchemaType, model } from 'mongoose'

const globalSettingsSchema = new Schema({
  id: { type: String, default: 'singleton', unique: true },
  totalStakes: { type: Number, default: 0 },
  GiveAwayPhoto: { type: Buffer, default: null },
})

export type GlobalSettings = InferSchemaType<typeof globalSettingsSchema>
const GlobalSettingsModel = model<GlobalSettings>('GlobalSettings', globalSettingsSchema)

export default GlobalSettingsModel
