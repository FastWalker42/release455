import { Schema, InferSchemaType, model } from 'mongoose'

const gameSchema = new Schema({
  id: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  crashCoeff: { type: Number, default: null },
})

export type Game = InferSchemaType<typeof gameSchema>
const GameModel = model<Game>('Game', gameSchema)

export default GameModel
