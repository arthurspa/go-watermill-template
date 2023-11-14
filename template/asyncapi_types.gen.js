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
            const pointerSymbol = field.required ? '' : '*';
            if (field.property.originalInput['x-asyncapi-codegen-extra-tags'] && field.property.originalInput['x-asyncapi-codegen-extra-tags']['validate']) {
              extension = `validate:"${field.property.originalInput['x-asyncapi-codegen-extra-tags']['validate']}"`
            }
            return `${field.propertyName} ${pointerSymbol}${field.property.type} \`json:"${field.unconstrainedPropertyName}" ${extension}\``;
          },
        }
      }
    ]
  });

  // For some reason v2 asyncpi is not working with the generator. So I had to convert it to v1
  const oldAsyncApi = convertToOldAPI(asyncapi);
  const models = await generator.generate(oldAsyncApi);

  let typesContent = `
package ${params.packageName}

import (
  "encoding/json"

  "github.com/ThreeDotsLabs/watermill/message"
)

`;

  const payloadUtils = `

// PayloadToMessage converts a payload to watermill message
func PayloadToMessage[T any](payload T) (*message.Message, error) {
	var message message.Message

	bytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	message.Payload = bytes

	return &message, nil
}

`;

  models.forEach(model => {
    typesContent += `
${model.dependencies.join('\n')}
${model.result}
`;
  });

  return (
    <File name="asyncapi_types.gen.go">
      {typesContent}
      {payloadUtils}
    </File>
  );
}
