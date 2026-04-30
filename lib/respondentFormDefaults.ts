import type { RespondentFieldDef } from "@/types/respondentForm";
import { SHOP_LOCATION_FIELD_ID } from "@/lib/shopCoordinates";
import {
  LEGACY_CATEGORY_OPTIONS,
  LEGACY_MARKET_OPTIONS,
} from '@/lib/respondentFormLegacy';

export const DEFAULT_RESPONDENT_SECTION_TITLE = 'Your details';

export const DEFAULT_RESPONDENT_SECTION_DESCRIPTION =
  'Tell us about the shop and yourself. All lists are editable under Settings → Respondent form.';

export const DEFAULT_RESPONDENT_FIELDS: RespondentFieldDef[] = [
  {
    id: 'shopName',
    kind: 'text',
    label: 'Shop name',
    placeholder: 'e.g. Khan General Store',
    required: true,
    maxLength: 300,
    multiline: false,
    description: '',
  },
  {
    id: 'shopCategory',
    kind: 'single',
    label: 'Shop category',
    required: true,
    options: LEGACY_CATEGORY_OPTIONS,
    description: 'What does this shop mainly sell?',
  },
  {
    id: 'shopAudience',
    kind: 'single',
    label: 'Who does this shop mainly serve?',
    required: true,
    options: ['Male', 'Female', 'Both'],
    description: 'Choose one.',
  },
  {
    id: 'market',
    kind: 'single',
    label: 'Market',
    required: true,
    options: LEGACY_MARKET_OPTIONS,
    description: 'Which market is this shop in?',
  },
  {
    id: SHOP_LOCATION_FIELD_ID,
    kind: 'location',
    label: 'Shop location on map',
    required: false,
    description: 'Drop a pin at the shop entrance or exact spot (optional).',
    defaultLat: 31.5204,
    defaultLng: 74.3587,
    defaultZoom: 13,
  },
  {
    id: 'respondentName',
    kind: 'text',
    label: 'Your name',
    placeholder: 'Person filling this survey',
    required: true,
    maxLength: 300,
    multiline: false,
    description: '',
  },
  {
    id: 'whatsappContact',
    kind: 'text',
    label: 'WhatsApp number',
    placeholder: '+92 300 1234567',
    required: true,
    maxLength: 40,
    multiline: false,
    description: '',
  },
  {
    id: 'shopImageUrls',
    kind: 'photo',
    label: 'Shop photos',
    required: false,
    description: 'Optional. JPEG, PNG, WebP, or GIF — up to 5 MB each.',
  },
];
