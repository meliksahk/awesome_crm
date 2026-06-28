// src/modules/quotes/quotes.module.ts
import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotesRepository } from './quotes.repository';

@Module({
  imports: [ProductsModule], // kalem çözümleme için ProductsService
  controllers: [QuotesController],
  providers: [QuotesService, QuotesRepository],
  exports: [QuotesService],
})
export class QuotesModule {}
