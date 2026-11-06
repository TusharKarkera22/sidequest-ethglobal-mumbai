import { bytes, defineSchema, str } from '@arkiv-network/sdk/schema';
import { ARKIV_NETWORK } from './arkiv-config';
export const SidequestRecords=defineSchema(ARKIV_NETWORK.schema,{
  kind:str().indexed(),
  ref:str().indexed(),
  category:str().indexed(),
  payload:bytes(),
});
