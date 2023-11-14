const { File } = require('@asyncapi/generator-react-sdk');
import { hasPubOrSub, hasSub, channelHasPub, channelHasSub, pascalCase } from '../components/common';


const subscriptionFunction = (channelName, operation, payload) => `
// ${operation} is the subscription wrapper handler for ${channelName}
func (w *SubscriberHandlerWrapper) ${operation}(msg *message.Message) error {

	var payload ${payload}
	err := json.Unmarshal(msg.Payload, &payload)
	if err != nil {
		return fmt.Errorf("${operation}: %w", err)
	}

	err = w.Handler.${operation}(msg.Context(), msg, &payload)

	return err
}
`;

const subscriptionHandlerInterfaceMethod = (channelName, operation, payload, summary) => `
  // ${summary}
  // Handler for ${channelName}
  ${operation}(ctx context.Context, msg *message.Message, payload *${payload}) error
`;

const routerSnippet = (channelName, operation) => `
  router.AddNoPublisherHandler(
    "${operation}",
    mergePrefixesToTopicName(topicNamePrefix, "${channelName}"),
    subscriber,
    wrapper.${operation},
)
`;

function SubscriptionHandlers(channels) {
  let output = '';

  for (const channel of channels) {
    if (channelHasPub(channel)) {
      const operation = pascalCase(channel.operations().filterByReceive()[0].id());
      if (!operation) {
        throw new Error('This template requires operationId to be set for every operation.');
      }

      const channelName = channel.id();
      const message = channel.messages()[0];
      const payload = pascalCase(message.payload().id());
      output += subscriptionFunction(channelName, operation, payload);
    }
  }

  return output;
}

function SubscriptionHandlerInterfaceMethods(channels) {

  let output = '';

  for (const channel of channels) {
    if (channelHasPub(channel)) {
      const operation = pascalCase(channel.operations().filterByReceive()[0].id());
      if (!operation) {
        throw new Error('This template requires operationId to be set for every operation.');
      }

      const channelName = channel.id();
      const message = channel.messages()[0];
      const payload = pascalCase(message.payload().id());
      const summary = message.summary();
      output += subscriptionHandlerInterfaceMethod(channelName, operation, payload, summary);
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

	"github.com/ThreeDotsLabs/watermill-googlecloud/pkg/googlecloud"
	"github.com/ThreeDotsLabs/watermill/message"
)

`;

  let constants = `
const (
  applicationId = "${params.applicationId}"
)

`


  let subscriberHandlers = `
type SubscriberHandlerInterface interface {
${SubscriptionHandlerInterfaceMethods(asyncapi.channels())}
}

type SubscriberHandlerWrapper struct {
  Handler SubscriberHandlerInterface
}

${SubscriptionHandlers(asyncapi.channels())}

func RegisterSubscriberHandlers(router *message.Router, subscriber message.Subscriber, subscriberHandler SubscriberHandlerInterface, topicNamePrefix string) {

  wrapper := SubscriberHandlerWrapper{
    Handler: subscriberHandler,
  }

  ${AddRouterSnippets(asyncapi.channels())}

}

func mergePrefixesToTopicName(topicNamePrefix string, topicName string) string {

	if applicationId != "" {
		topicName = applicationId + "-" + topicName
	}

	if topicNamePrefix != "" {
		topicName = topicNamePrefix + "-" + topicName
	}

	return topicName
}

`

  return (
    <File name="asyncapi_api.gen.go">
      {imports}
      {constants}
      {hasSub(asyncapi) ? subscriberHandlers : ''}
    </File>
  );
}