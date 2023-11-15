const { File } = require('@asyncapi/generator-react-sdk');
import { hasPubOrSub, hasSub, channelHasPub, channelHasSub, pascalCase } from '../components/common';


const subscriptionFunction = (channelName, operationId, payload) => `
// ${operationId} handles messages coming from topic ${channelName}
func (w *SubscriberHandlerWrapper) ${operationId}(msg *message.Message) error {

	var payload ${payload}
	err := json.Unmarshal(msg.Payload, &payload)
	if err != nil {
		return fmt.Errorf("${operationId}: %w", err)
	}

	err = w.Handler.${operationId}(msg.Context(), msg, &payload)

	return err
}
`;

const subscriptionHandlerInterfaceMethod = (channelName, operationId, payload, summary) => `
  // ${summary}
  // Topic: ${channelName}
  ${operationId}(ctx context.Context, msg *message.Message, payload *${payload}) error
`;

const routerSnippet = (channelName, operation) => `
  router.AddNoPublisherHandler(
    "${operation}",
    mergePrefixToTopicName(topicNamePrefix, "${channelName}"),
    subscriber,
    wrapper.${operation},
)
`;

function SubscriptionHandlers(channels) {
  let output = '';

  for (const channel of channels) {
    if (channelHasPub(channel)) {
      const operation = channel.operations().filterByReceive()[0]
      const operationId = pascalCase(operation.id());
      if (!operationId) {
        throw new Error('This template requires operationId to be set for every operation.');
      }

      const channelName = channel.id();
      const message = channel.messages()[0];
      const payload = pascalCase(message.payload().id());
      output += subscriptionFunction(channelName, operationId, payload);
    }
  }

  return output;
}

function SubscriptionHandlerInterfaceMethods(channels) {

  let output = '';

  for (const channel of channels) {
    if (channelHasPub(channel)) {
      const operation = channel.operations().filterByReceive()[0]
      const operationId = pascalCase(operation.id());
      if (!operationId) {
        throw new Error('This template requires operationId to be set for every operation.');
      }

      const channelName = channel.id();
      const message = channel.messages()[0];
      const payload = pascalCase(message.payload().id());
      const summary = operation.summary();
      output += subscriptionHandlerInterfaceMethod(channelName, operationId, payload, summary);
    }
  }

  return output;
}

function AddRouterSnippets(channels) {
  let output = '';

  for (const channel of channels) {
    if (channelHasPub(channel)) {
      const operation = pascalCase(channel.operations().filterByReceive()[0].id());
      if (!operation) {
        throw new Error('This template requires operationId to be set for every operation.');
      }

      const channelName = channel.id();
      output += routerSnippet(channelName, operation);
    }
  }

  return output;
}


export default async function ({ asyncapi, params }) {

  if (!hasPubOrSub(asyncapi)) {
    return;
  }


  let imports = `
package ${params.packageName}

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ThreeDotsLabs/watermill/message"
)

`;



  let body = `
type SubscriberHandlerInterface interface {
${SubscriptionHandlerInterfaceMethods(asyncapi.channels())}
}

type SubscriberHandlerWrapper struct {
  Handler SubscriberHandlerInterface
}

${SubscriptionHandlers(asyncapi.channels())}

func RegisterSubscriberHandlers(router *message.Router, subscriber message.Subscriber, subscriberHandler SubscriberHandlerInterface) {

  RegisterSubscriberHandlersWithTopicPrefix(router, subscriber, subscriberHandler, "")

}

func RegisterSubscriberHandlersWithTopicPrefix(router *message.Router, subscriber message.Subscriber, subscriberHandler SubscriberHandlerInterface, topicNamePrefix string) {

  wrapper := SubscriberHandlerWrapper{
    Handler: subscriberHandler,
  }

  ${AddRouterSnippets(asyncapi.channels())}

}

`;

  return (
    <File name="asyncapi_sub.gen.go">
      {imports}
      {hasSub(asyncapi) ? body : ''}
    </File>
  );
}