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
    "github.com/ThreeDotsLabs/watermill/message/router/middleware"
)
`;

    let body = `
type contextId int

const (
    correlationIdKey contextId = iota
)

// WithCorrelationId sets the correlation id in the context
// It should be used when the message enters the system.
// When message is produced in a request (for example HTTP),
// correlation ID should be the same as the request's correlation ID (request id).
func WithCorrelationId(ctx context.Context, correlationId string) context.Context {
    return context.WithValue(ctx, correlationIdKey, correlationId)
}

// CorrelationIdFromCtx returns the correlation id from the context
func CorrelationIdFromCtx(ctx context.Context) string {
    if ctx == nil {
        return ""
    }

    if correlationId, ok := ctx.Value(correlationIdKey).(string); ok {
        return correlationId
    }

    return ""
}

// PayloadToMessage converts a payload to watermill message
// It sets the correlation id from the context if it exists
func PayloadToMessage[T any](ctx context.Context, payload T) (*message.Message, error) {
    var msg message.Message
    msg.UUID = watermill.NewUUID()

    correlationId := CorrelationIdFromCtx(ctx)
    if correlationId != "" {
        middleware.SetCorrelationID(correlationId, &msg)
    }

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
