import { useEffect, useState } from "react";

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "record_user_emotion",
        description: "Record the user's emotion captured from their voice.",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            user_emotion: {
              type: "string",
              enum: ["happy", "sad", "confused", "frustrated"],
              description: "The emotion expressed by the user's voice.",
            },
          },
          required: ["user_emotion"],
        },
      },
    ],
    instructions:
      "When the user speaks, capture their voice emotion and use record_user_emotion to record it.",
    tool_choice: "auto"
  },
};

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [userEmotions, setUserEmotions] = useState([]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "record_user_emotion"
        ) {
          console.log("LLM called record_user_emotion with arguments:", output.arguments);
          const { user_emotion } = JSON.parse(output.arguments);
          setUserEmotions(prev => [user_emotion, ...prev]);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions:
                  "Thanks for sharing your feelings. Your emotion has been recorded.",
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setUserEmotions([]);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">User Emotion Detection</h2>
        {isSessionActive ? (
          <>
            {userEmotions.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                {userEmotions.map((emotion, index) => (
                  <div key={index} className="p-2 border rounded-md bg-gray-100">
                    <p className="text-sm font-semibold">
                      Recorded Emotion: {emotion}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p>Speak to record your emotion...</p>
            )}
          </>
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
