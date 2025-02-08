import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for a color palette.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
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

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Theme: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  // Change from single emotion to an array to store all emotions
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
          output.name === "display_color_palette"
        ) {
          console.log("LLM called display_color_palette with arguments:", output.arguments);
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask for feedback about the color palette - don't repeat 
                the colors, just ask if they like the colors.
              `,
              },
            });
          }, 500);
        }
        if (
          output.type === "function_call" &&
          output.name === "record_user_emotion"
        ) {
          console.log("LLM called record_user_emotion with arguments:", output.arguments);
          const { user_emotion } = JSON.parse(output.arguments);
          // Prepend new emotion so most recent is on top
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
      setFunctionCallOutput(null);
      setUserEmotions([]);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Color Palette Tool</h2>
        {isSessionActive ? (
          <>
            {functionCallOutput ? (
              <FunctionCallOutput functionCallOutput={functionCallOutput} />
            ) : (
              <p>Ask for advice on a color palette...</p>
            )}
            {/* Render all recorded emotions with the most recent on top */}
            {userEmotions.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {userEmotions.map((emotion, index) => (
                  <div key={index} className="p-2 border rounded-md bg-gray-100">
                    <p className="text-sm font-semibold">
                      Recorded Emotion: {emotion}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
