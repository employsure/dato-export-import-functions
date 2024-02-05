import { buildClient } from '@datocms/cma-client-node';
import fs from 'fs/promises';
import { modelNames } from './data';

const DATO_API_KEY = process.env.DATO_API_KEY
const DATOCMS_ENVIRONMENT= process.env.DATOCMS_ENVIRONMENT
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = buildClient({
  apiToken: DATO_API_KEY!,
  environment: DATOCMS_ENVIRONMENT,
});

const getItemTypeId = async (apiKey: string) => {
  const itemTypes = await client.itemTypes.list();
  const itemTypeID = itemTypes.filter((item) => item.api_key == apiKey)

  return itemTypeID[0].id
}

// Exporting data from Dato model to a local JSON file 
export const exportDataToJSON = async (model:string) =>  {
  const itemTypes = await client.itemTypes.list();
  const specificItemTypes = itemTypes.filter((item) => item.api_key == model)
  const models = specificItemTypes.filter((itemType) => !itemType.modular_block);
  const modelIds = models.map((model) => model.id);

  const records = [];
  for await (const record of client.items.listPagedIterator({
    nested: true,
    filter: { type: modelIds.join(',') },
  })) {
    records.push(record);
  }
  const jsonContent = JSON.stringify(records, null, 2);

  await fs.writeFile(`${model}.json`, jsonContent, 'utf8')
}

// Pushes local data to Dato
const pushDataToDato = async (model:string, dataToPost:any) => {
  delete dataToPost["id"]
  delete dataToPost["meta"]["stage"]
  delete dataToPost["meta"]["unpublishing_scheduled_at"]
  delete dataToPost["item_type"]

 console.log("new data")
 console.log(dataToPost)

  await client.items.create({
    item_type: {
      type: 'item_type',
      id: await getItemTypeId(model),
    },
    ...dataToPost
  })
  
}

const main = async () => {
  // EXPORT DATA

  // Creates multiple files with files in model names: modelNames[i].json
  for (let i = 0 ; i < modelNames.length; i++) {
    await exportDataToJSON(modelNames[i]) 
  }

}

// console.time("start dato import")
// for (let i = 0 ; i < empauVideoJson.length; i++) {
//   pushDataToDato("testing_import", empauVideoJson[i])
// }
// console.timeEnd("start dato import")


// exportDataToJSON("empau_blog_post", "empauBlogPost")

