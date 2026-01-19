import { blogPost } from './blogPost'
import { product } from './product'
import { faq } from './faq'
import { simpleWorkshop } from './simpleWorkshop'
import inventoryLog from './inventoryLog'
import { order } from './order'
import { inventory } from './inventory'
import { mossSpecies } from './mossSpecies'
import { maintenanceSettings } from './maintenanceSettings'
import { heroImageSettings } from './heroImageSettings'

export const schemaTypes = [
  simpleWorkshop,
  blogPost,
  product,
  faq,
  inventoryLog,
  order,
  inventory,
  mossSpecies,
  maintenanceSettings,
  heroImageSettings,
]