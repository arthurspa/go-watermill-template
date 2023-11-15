const { File } = require('@asyncapi/generator-react-sdk');
import { hasPubOrSub, hasSub, headerComment, channelHasSub, pascalCase } from '../components/common';

const publisherFunction = (channelName, operationId, payload, summary) => `
// ${operationId} publishes messages to topic ${channelName}
// ${summary}
func (ph *PublisherHandler) ${operationId}(ctx context.Context, payload ${payload}) (*message.Message, error) {
	msg, err := PayloadToMessage(ctx, payload)
	if err != nil {
		return nil, fmt.Errorf("${operationId}: %w", err)
	}

	topicName := mergePrefixToTopicName(ph.topicNamePrefix, "${channelName}")
	err = ph.publish(ctx, topicName, msg)
	if err != nil {
		return nil, fmt.Errorf("${operationId}: %w", err)
	}

	return msg, nil
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
	"github.com/ThreeDotsLabs/watermill/message"
)

`;


  let body = `
type BeforePublishFn func(ctx context.Context, topicName string, msg *message.Message)
type AfterPublishFn func(ctx context.Context, topicName string, msg *message.Message, err error)

type PublisherHandlerConfig struct {
  BeforePublishFn BeforePublishFn
  AfterPublishFn  AfterPublishFn
}

type PublisherHandler struct {
  publisher       *googlecloud.Publisher
  topicNamePrefix string
  beforePublishFn BeforePublishFn
  afterPublishFn  AfterPublishFn
}

func NewPublisherHandler(config PublisherHandlerConfig, publisher *googlecloud.Publisher) *PublisherHandler {
  return NewPublisherHandlerWithTopicPrefix(config, publisher, "")
}

func NewPublisherHandlerWithTopicPrefix(config PublisherHandlerConfig, publisher *googlecloud.Publisher, topicNamePrefix string) *PublisherHandler {
  return &PublisherHandler{
    publisher:       publisher,
    topicNamePrefix: topicNamePrefix,
    beforePublishFn: config.BeforePublishFn,
    afterPublishFn:  config.AfterPublishFn,
  }
}

func (ph *PublisherHandler) beforePublish(ctx context.Context, topicName string, msg *message.Message) {
  ph.beforePublishFn(ctx, topicName, msg)
}

func (ph *PublisherHandler) publish(ctx context.Context, topicName string, msg *message.Message) error {
  if ph.beforePublishFn != nil {
    ph.beforePublishFn(ctx, topicName, msg)
  }

  err := ph.publisher.Publish(topicName, msg)

  if ph.afterPublishFn != nil {
    ph.afterPublishFn(ctx, topicName, msg, err)
  }

  return err
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