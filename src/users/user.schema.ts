/* eslint-disable prettier/prettier */
import { Schema, Document } from 'mongoose';

export const UserSchema = new Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  lastname: { type: String, required: true },
  company: { type: String, required: true },
  doc: { type: String, required: true },
  position: { type: String, required: true },
  confirmPassword: { type: String, required: true },
  check: { type: String, required: true },
  resetPasswordToken: { type: String, required: false }, // Campo opcional
  resetPasswordExpires: { type: Date, required: false }, // Campo opcional
});

export interface User extends Document {
  id: string;
  name: string;
  lastname: string;
  company: string;
  doc: string;
  position: string;
  username: string;
  password: string;
  confirmPassword: string;
  check: number;
  resetPasswordToken?: string | null; // Marca el campo como opcional
  resetPasswordExpires?: Date | null; // Marca el campo como opcional
}
