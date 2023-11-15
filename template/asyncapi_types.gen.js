const { GoGenerator } = require('@asyncapi/modelina');
const { File } = require('@asyncapi/generator-react-sdk');
const { convertToOldAPI } = require('@asyncapi/parser');

export default async function ({ asyncapi, params }) {
  const generator = new GoGenerator({
    presets: [
      {
        struct: {
          field({ field }) {

            let extension = '';

            // Modelina does not support nullable fields yet. See https://github.com/asyncapi/modelina/issues/1418
            const pointerSymbol = field.required ? '' : '*';

            // Modelina does not support the property 'format' as oapi-codegen does. So we have to manually add it.
            let propertyType = '';
            if (field.property.originalInput.format === 'int64' || field.property.originalInput.format === 'time.Time') {
              propertyType = field.property.originalInput.format
            } else {
              propertyType = field.property.type
            }

            // Modelina does not support extra tag for validation as oapi-codegen does. So we have to manually add it.
            if (field.property.originalInput['x-asyncapi-codegen-extra-tags'] && field.property.originalInput['x-asyncapi-codegen-extra-tags']['validate']) {
              extension = `validate:"${field.property.originalInput['x-asyncapi-codegen-extra-tags']['validate']}"`
            }


            return `${field.propertyName} ${pointerSymbol}${propertyType} \`json:"${field.unconstrainedPropertyName}" ${extension}\``;
          },
        }
      }
    ]
  });

  // For some reason v2 asyncpi is not working with the generator. So I had to convert it to v1
  const oldAsyncApi = convertToOldAPI(asyncapi);
  const models = await generator.generate(oldAsyncApi);

  let imports = `
package ${params.packageName}

`;

  let body = "";

  models.forEach(model => {
    body += `
${model.dependencies.join('\n')}
${model.result}
`;
  });

  return (
    <File name="asyncapi_types.gen.go">
      {imports}
      {body}
    </File>
  );
}
