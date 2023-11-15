const { File } = require('@asyncapi/generator-react-sdk');
import { headerComment } from '../components/common';

export default async function ({ asyncapi, params }) {
    const comment = headerComment(params.packageName)

    let imports = `
package ${params.packageName}

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
)
`;

    let body = `
// PayloadToMessage converts a payload to watermill message
// It sets the correlation id from the context if it exists
func PayloadToMessage[T any](ctx context.Context, payload T) (*message.Message, error) {
    var msg message.Message
    msg.UUID = watermill.NewUUID()
    msg.Metadata = message.Metadata{}

    bytes, err := json.Marshal(payload)
    if err != nil {
        return nil, fmt.Errorf("PayloadToMessage: %w", err)
    }
    msg.Payload = bytes

    return &msg, nil
}

// mergePrefixToTopicName merges the topicNamePrefix with the topicName
func mergePrefixToTopicName(topicNamePrefix string, topicName string) string {

    if topicNamePrefix != "" {
        topicName = topicNamePrefix + "_" + topicName
    }

    return topicName
}
`;


    return (
        <File name="asyncapi_utils.gen.go">
            {comment}
            {imports}
            {body}
        </File>
    );
}
