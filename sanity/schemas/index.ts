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
import { backgroundImageSettings } from './backgroundImageSettings'
import { salesItem } from './salesItem'
import { dailySales } from './dailySales'
import { inStoreCharge } from './inStoreCharge'
import { storeTransaction } from './storeTransaction'
import { siteSettings } from './siteSettings'
import { pageContent } from './pageContent'
import { paymentSettings } from './paymentSettings'
import { shippingSettings } from './shippingSettings'

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
  backgroundImageSettings,
  salesItem,
  dailySales,
  inStoreCharge,
  storeTransaction,
  siteSettings,
  pageContent,
  paymentSettings,
  shippingSettings,
]
