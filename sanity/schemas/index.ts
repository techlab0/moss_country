import { workshop } from './workshop'
import { blogPost } from './blogPost'
import { product } from './product'
import { faq } from './faq'
import { simpleWorkshop } from './simpleWorkshop'
import inventoryLog from './inventoryLog'

export const schemaTypes = [
  simpleWorkshop,
  workshop,
  blogPost,
  product,
  faq,
  inventoryLog,
]