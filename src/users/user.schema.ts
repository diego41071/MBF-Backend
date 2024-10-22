/* eslint-disable prettier/prettier */
import { Schema, Document } from 'mongoose';

export const UserSchema = new Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});

export interface User extends Document {
    id: string;
    username: string;
    password: string;
}