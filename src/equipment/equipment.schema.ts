/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipmentDocument = Equipment & Document;

@Schema({ timestamps: true })
export class Equipment {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  serial: string;

  @Prop({ required: true })
  issue: string;

  @Prop({ required: false })
  photo: string;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
