const { File } = require('@asyncapi/generator-react-sdk');
import { hasPubOrSub, hasSub, headerComment, channelHasSub, pascalCase } from '../components/common';

const publisherFunction = (channelName, operationId, payload, summary) => `
// ${operationId} publishes messages to topic ${channelName}
// ${summary}
func (ph *PublisherHandler) ${operationId}(ctx context.Context, payload ${payload}) (string, error) {
	msg, err := PayloadToMessage(ctx, payload)
	if err != nil {
		return "", fmt.Errorf("${operationId}: %w", err)
	}

	topicName := mergePrefixToTopicName(ph.topicNamePrefix, "${channelName}")
	err = ph.publisher.Publish(topicName, msg)
	if err != nil {
		return "", fmt.Errorf("${operationId}: %w", err)
	}

	return msg.UUID, nil
}
`;

function PublisherHandlers(channels) {
  let output = '';

  for (const channel of channels) {
    if (channelHasSub(channel)) {
      const operation = channel.operations().filterBySend()[0]
      const operationId = pascalCase(operation.id());
      if (!operationId) {
        throw new Error('This template requires operationId to be set for every operation.');
      }

      const channelName = channel.id();
      const message = channel.messages()[0];
      const payload = pascalCase(message.payload().id());
      const summary = operation.summary();
      output += publisherFunction(channelName, operationId, payload, summary);
    }
  }

  return output;
}


export default async function ({ asyncapi, params }) {

  if (!hasPubOrSub(asyncapi)) {
    return;
  }

  console.log('####', params)
  const comment = headerComment(params.packageName)

  let imports = `
package ${params.packageName}

import (
	"context"
	"fmt"

	"github.com/ThreeDotsLabs/watermill-googlecloud/pkg/googlecloud"
)

`;


  let body = `
type PublisherHandler struct {
  publisher       *googlecloud.Publisher
  topicNamePrefix string
}

func NewPublisherHandler(publisher *googlecloud.Publisher) *PublisherHandler {
  return NewPublisherHandlerWithTopicPrefix(publisher, "")
}

func NewPublisherHandlerWithTopicPrefix(publisher *googlecloud.Publisher, topicNamePrefix string) *PublisherHandler {
  return &PublisherHandler{
    publisher:       publisher,
    topicNamePrefix: topicNamePrefix,
  }
}

${PublisherHandlers(asyncapi.channels())}

`;



  return (
    <File name="asyncapi_pub.gen.go">
      {comment}
      {imports}
      {hasSub(asyncapi) ? body : ''}
    </File>
  );
}