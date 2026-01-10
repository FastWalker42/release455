import mongoose from 'mongoose'
import UserModel from './user'
import BetHistoryModel from './bethistory'
import GameModel from './game'
import BankModel from './bank'
import ReflinkModel from './reflink'
import OperHistoryModel from './operhistory'
import GlobalSettingsModel from './globalsettings'

try {
  await mongoose.connect('mongodb://127.0.0.1:27017/crashGame')
  console.log('MongoDB connected')
} catch (error) {
  console.error('MongoDB connection error:', error)
}

export const User = UserModel
export const BetHistory = BetHistoryModel
export const Game = GameModel
export const Bank = BankModel
export const Reflink = ReflinkModel
export const OperHistory = OperHistoryModel
export const GlobalSettings = GlobalSettingsModel
