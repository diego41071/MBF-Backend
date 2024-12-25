/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type EquipmentDocument = Equipment & Document;

@Schema()
export class Equipment {
  @Prop()
  name: string;

  @Prop()
  brand: string;

  @Prop()
  model: string;

  @Prop()
  serial: string;

  @Prop()
  issue: string;

  @Prop({ type: [SchemaTypes.Buffer] })
  photos: Buffer[];

  @Prop({ type: SchemaTypes.Buffer })
  invoice: Buffer;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
