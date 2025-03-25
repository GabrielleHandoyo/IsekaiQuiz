import React, { useEffect, useRef, useState } from "react";
import bridge from "../services/Bridge";
import "./Animations.css";
import "./Phone.css";
import "./ReincarnationQuiz.css";
import "./RatingSystem.css";

const ReincarnationQuiz = () => {
  //---------------------------------------------------------------------------

  //                              STATE VARIABLES

  //---------------------------------------------------------------------------

  // Quiz flow state
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Star rating state
  const [rating, setRating] = useState(0);
  const [tempRating, setTempRating] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);
  const [isRatingConfirmed, setIsRatingConfirmed] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Ref for scrolling
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);

  //---------------------------------------------------------------------------

  //                               USE EFFECTS

  //---------------------------------------------------------------------------

  // Initialize quiz on component mount
  useEffect(() => {
    startQuiz();
  }, []);

  // Scroll effect for all messages including texting animations
  useEffect(() => {
    const timer = setTimeout(() => {
      smoothScrollToBottom();
    }, 100);

    return () => clearTimeout(timer);
  }, [
    messages,
    isLoading,
    showOptions,
    rating,
    showThankYou,
    tempRating,
    isRatingConfirmed,
  ]);

  //---------------------------------------------------------------------------

  //                              HELPER FUNCTIONS

  //---------------------------------------------------------------------------

  // Smooth scrolling
  const smoothScrollToBottom = () => {
    if (messageContainerRef.current) {
      const container = messageContainerRef.current;
      const targetPosition = container.scrollHeight - container.clientHeight;

      // Only scroll if its not at the bottom
      // Implimented because of scrolling jitters
      if (container.scrollTop < targetPosition - 20) {
        container.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
      }
    }
  };

  // Current time
  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  //---------------------------------------------------------------------------

  //                           QUIZ FUNCTIONS/FLOW

  //---------------------------------------------------------------------------

  // Starts a new quiz by calling the API
  const startQuiz = async () => {
    try {
      setIsLoading(true);
      const data = await bridge.startQuiz();
      setSessionId(data.session_id);
      setCurrentQuestion(data.question);

      // Reset all rating to prevent trash numbers and false true
      setRating(0);
      setTempRating(0);
      setShowThankYou(false);
      setIsRatingSubmitted(false);
      setIsRatingConfirmed(false);

      // Display first message
      setMessages([
        {
          sender: "god",
          text: data.question.text,
          id: `god-question-intro`,
        },
      ]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error starting quiz:", error);
      setIsLoading(false);
    }
  };

  // When user answers, reply and then next or result
  // Main loop
  const handleChoice = async (choice) => {
    // Delay
    const DELAY = 1500;
    const TYPING_DELAY = 2500;

    // Hide options to preven double answers
    setShowOptions(false);

    // Add user's answer to the message list
    const newMessages = [
      ...messages,
      {
        sender: "user",
        text: choice,
        id: `user-choice-${currentQuestion.id}`,
      },
    ];

    //Send out user answer
    setMessages(newMessages);
    smoothScrollToBottom();

    try {
      // Send user choice and waits for response
      const data = await bridge.submitAnswer(sessionId, choice);

      // Check if the server replaced our session (session expired)
      if (data.session_replaced) {
        console.log("Session was replaced by server:", data.message);

        // Update the session ID with the new one
        setSessionId(data.session_id);

        // Display message to user about session reset
        const sessionResetMessages = [
          ...newMessages,
          {
            sender: "god",
            text: "Hmm, it seems your soul connection was temporarily lost. Let's start over with a fresh connection.",
            id: "god-session-reset",
          },
        ];

        setMessages(sessionResetMessages);

        // Replace current question with the first question
        setCurrentQuestion(data.question);

        // Show options again after delay
        setTimeout(() => {
          setShowOptions(true);
          smoothScrollToBottom();
        }, 2000);

        return; // Exit early, don't continue with normal flow
      }

      // Delay before god starts typing
      setTimeout(() => {
        setIsLoading(true);
        smoothScrollToBottom();

        // Show god's reply after typing animation
        setTimeout(() => {
          setIsLoading(false);

          // Add god's reply to messages list
          // Coding info: ... -> take all items from this existing array and put them in this new array I'm creating
          const updatedMessages = [
            ...newMessages,
            {
              sender: "god",
              text: data.god_response,
              id: `god-response-${currentQuestion.id}`,
            },
          ];

          // Send out god's reply
          setMessages(updatedMessages);
          smoothScrollToBottom();

          // If quiz is complete, go results sequence
          if (data.quiz_complete) {
            handleResultsSequence(updatedMessages, data.result);
          } else {
            // If not, continue to next question
            handleNextQuestion(updatedMessages, data.next_question);
          }
        }, TYPING_DELAY);
      }, DELAY);
    } catch (error) {
      console.error("Error submitting answer:", error);
      setIsLoading(false);

      // Handle errors gracefully - show error message to user
      const errorMessages = [
        ...newMessages,
        {
          sender: "god",
          text: "There seems to be a disruption in our cosmic connection. Let me try to reestablish it...",
          id: "god-error-message",
        },
      ];

      setMessages(errorMessages);

      // Try to restart after a delay
      setTimeout(() => {
        startQuiz();
      }, 3000);
    }
  };

  // Next question function
  const handleNextQuestion = (currentMessages, nextQuestion) => {
    // Delay const
    const RESPONSE_TO_QUESTION_DELAY = 2500;
    const NEXT_QUESTION_TYPING = 3500;
    const OPTIONS_DELAY = 2000;

    setTimeout(() => {
      // Show typing animation
      setIsLoading(true);
      smoothScrollToBottom();

      setTimeout(() => {
        // Stop animation
        setIsLoading(false);

        // Add the next question
        setMessages((prev) => {
          const newMsgs = [
            ...currentMessages,
            {
              sender: "god",
              text: nextQuestion.text,
              id: `god-question-${nextQuestion.id}`,
            },
          ];
          smoothScrollToBottom();
          return newMsgs;
        });

        setCurrentQuestion(nextQuestion);

        // Show answer options after delay
        setTimeout(() => {
          setShowOptions(true);
          smoothScrollToBottom();
        }, OPTIONS_DELAY);
      }, NEXT_QUESTION_TYPING);
    }, RESPONSE_TO_QUESTION_DELAY);
  };

  // Result function when quiz is compelte
  // 1: Processing message 2: you will be reborn as a 3: image 4: description 5: ask for rating
  const handleResultsSequence = (currentMessages, result) => {
    // Delay const
    const DELAY = 1500;
    const TYPING_DELAY = 2500;
    const RESULTS_DELAY = 6000;
    const PICTURE_DELAY = 2000;
    const DESC_DELAY = 3000;
    const TYPING_FOR_DESC = 4000;
    const RATING_DELAY = 4000;

    // Delay before typing animation
    setTimeout(() => {
      setIsLoading(true);
      smoothScrollToBottom();

      // Show typing for 'processing......' message
      setTimeout(() => {
        setIsLoading(false);

        // Send out 'processing......' message
        setMessages((prev) => {
          const newMsgs = [
            ...prev,
            {
              sender: "god",
              text: "Alright, I got all the data I need. Processing... processing... 🖥️",
              id: "god-processing",
            },
          ];
          smoothScrollToBottom();
          return newMsgs;
        });

        // Delay before showing results
        setTimeout(() => {
          // Send out 'you will be reborn as...' message
          setMessages((prev) => {
            const newMsgs = [
              ...prev,
              {
                sender: "god",
                text: `🎉 YOUR REINCARNATION RESULTS ARE IN! 🎉\n\nYou will be reborn as a *drum roll*`,
                id: "god-result-text",
              },
            ];
            smoothScrollToBottom();
            return newMsgs;
          });

          // Send image
          setTimeout(() => {
            setMessages((prev) => {
              const newMsgs = [
                ...prev,
                {
                  sender: "god",
                  isImage: true,
                  creature: result.creature,
                  imageUrl: result.image_url,
                  id: "god-result-image",
                },
              ];

              setTimeout(() => smoothScrollToBottom(), 100);
              return newMsgs;
            });

            // Send out description message
            setTimeout(() => {
              setIsLoading(true);
              smoothScrollToBottom();

              setTimeout(() => {
                setIsLoading(false);

                setMessages((prev) => {
                  const newMsgs = [
                    ...prev,
                    {
                      sender: "god",
                      text: `${result.description}\n\nCongratulations on your new life! The cosmos has aligned to match your personality perfectly with your new form.\n\n"This is gonna be so much fun to watch!" 😈`,
                      id: "god-result-desc",
                    },
                  ];
                  smoothScrollToBottom();
                  return newMsgs;
                });

                // Ask for rating
                setTimeout(() => {
                  // Reset rating state
                  setRating(0);
                  setTempRating(0);
                  setHoverRating(0);
                  setShowThankYou(false);
                  setIsRatingSubmitted(false);
                  setIsRatingConfirmed(false);

                  setMessages((prev) => {
                    const newMsgs = [
                      ...prev,
                      {
                        sender: "god",
                        isRating: true,
                        result: result,
                        id: "god-rating-request",
                      },
                    ];
                    smoothScrollToBottom();
                    return newMsgs;
                  });
                }, RATING_DELAY);
              }, TYPING_FOR_DESC);
            }, DESC_DELAY);
          }, PICTURE_DELAY);
        }, RESULTS_DELAY);
      }, TYPING_DELAY);
    }, DELAY);
  };

  // Submit user rating and thank you message
  const handleRatingConfirmed = async (selectedRating, resultData) => {
    try {
      console.log("Submitting rating to backend:", {
        sessionId,
        rating: selectedRating,
        personalityType: resultData.personality_type,
      });

      // Send rating to backend
      const ratingResponse = await bridge.submitRating(
        sessionId,
        selectedRating,
        resultData.personality_type
      );

      console.log("Rating submission response:", ratingResponse);

      // Show thank you message
      setIsRatingSubmitted(true);

      // After delay, show restart message
      setTimeout(() => {
        setIsLoading(true);

        setTimeout(() => {
          setIsLoading(false);

          // Add restart message
          setMessages((prev) => {
            const newMessages = [
              ...prev,
              {
                sender: "god",
                text: "Want to try again? Your soul is pretty flexible. I can put you through the process again if you want a different result. Just say 'restart'!",
                id: "god-restart-offer",
              },
            ];

            setTimeout(() => {
              smoothScrollToBottom();
            }, 100);

            return newMessages;
          });

          setShowResult(true);
        }, 2500);
      }, 3000);
    } catch (error) {
      console.error("Failed to submit rating:", error);
      // Log detailed error information
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request:", error.request);
      } else {
        console.error("Error message:", error.message);
      }

      // Show error message to user but continue flow
      setMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            sender: "god",
            text: "I couldn't record your rating in the cosmic ledger, but thank you for the feedback anyway!",
            id: "god-rating-error",
          },
        ];
        return newMessages;
      });

      // Set as submitted anyway to continue flow
      setIsRatingSubmitted(true);

      // Continue to restart message after delay
      setTimeout(() => {
        setIsLoading(true);

        setTimeout(() => {
          setIsLoading(false);

          // Add restart message
          setMessages((prev) => {
            const newMessages = [
              ...prev,
              {
                sender: "god",
                text: "Want to try again? Your soul is pretty flexible. I can put you through the process again if you want a different result. Just say 'restart'!",
                id: "god-restart-offer",
              },
            ];

            setTimeout(() => {
              smoothScrollToBottom();
            }, 100);

            return newMessages;
          });

          setShowResult(true);
        }, 2500);
      }, 3000);
    }
  };

  // Restart the quiz with the same session ID
  const handleRestart = async () => {
    try {
      const data = await bridge.restartQuiz(sessionId);

      // If the server sent us a new session ID (old one was invalid), update it
      if (data.session_id) {
        console.log("Updating session ID during restart:", data.session_id);
        setSessionId(data.session_id);
      }

      setCurrentQuestion(data.question);
      setShowResult(false);

      // Reset all rating to prevent trash numbers and false true
      setRating(0);
      setTempRating(0);
      setHoverRating(0);
      setShowThankYou(false);
      setIsRatingSubmitted(false);
      setIsRatingConfirmed(false);

      // Show first question
      setMessages([
        {
          sender: "god",
          text: data.question.text,
          id: "restart-question",
        },
      ]);

      // Show options after delay
      setTimeout(() => {
        setShowOptions(true);
        smoothScrollToBottom();
      }, 3000);
    } catch (error) {
      console.error("Error restarting quiz:", error);

      // Handle restart error by starting a fresh quiz
      setMessages([
        {
          sender: "god",
          text: "There was a disturbance in the cosmic flow. Let's start fresh.",
          id: "restart-error",
        },
      ]);

      // Start fresh after delay
      setTimeout(() => {
        startQuiz();
      }, 2000);
    }
  };

  // Function to handle user input "restart"
  const handleUserInput = (e) => {
    if (e.key === "Enter" && e.target.value.toLowerCase().includes("restart")) {
      handleRestart();
      e.target.value = "";
    }
  };

  //---------------------------------------------------------------------------

  //                               UI FUNCTIONS

  //---------------------------------------------------------------------------

  // Show typing animation
  const renderLoadingDots = () => {
    return (
      <div className="loading-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    );
  };

  // Show user options
  const renderOptions = () => {
    if (!currentQuestion || !currentQuestion.options || !showOptions)
      return null;

    return (
      <div className="options-container">
        {currentQuestion.options.map((option, index) => (
          <div
            key={index}
            className="option"
            onClick={() => handleChoice(option.text)}
          >
            {option.text}
          </div>
        ))}
      </div>
    );
  };

  // Creature Image with the ability to fullscreen
  const getCreatureImage = (creature, imageUrl) => {
    return (
      <div className="creature-card">
        <div
          className="creature-image"
          onClick={() => setFullscreenImage(imageUrl)}
        >
          <img
            src={imageUrl}
            alt={creature}
            loading="eager"
            onLoad={() => setTimeout(() => smoothScrollToBottom(), 50)}
            onError={(e) => {
              console.error(`Failed to load image for ${creature}`);
              e.target.src = `${window.location.origin}/images/creatures/mystery-being.jpg`;
            }}
          />
        </div>
      </div>
    );
  };

  // Show 5 star rating system
  const renderStarRating = (resultData) => {
    return (
      <div className="star-rating-container">
        <div className="rating-question">
          How would you rate your reincarnation experience?
        </div>

        <div
          className={`stars-container ${isRatingConfirmed ? "locked" : ""}`}
          onMouseLeave={() => !isRatingConfirmed && setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${
                hoverRating >= star || (!hoverRating && tempRating >= star)
                  ? "selected"
                  : ""
              } ${isRatingConfirmed ? "locked" : ""}`}
              onClick={() => {
                if (!isRatingConfirmed) {
                  setTempRating(star);
                  setHoverRating(0);
                }
              }}
              onMouseEnter={() => !isRatingConfirmed && setHoverRating(star)}
            >
              ★
            </span>
          ))}
        </div>

        {tempRating > 0 && !isRatingConfirmed && (
          <div className="confirm-rating">
            <p>You selected {tempRating} stars. Is this correct?</p>
            <button
              className="confirm-button"
              onClick={() => {
                setRating(tempRating);
                setIsRatingConfirmed(true);
                handleRatingConfirmed(tempRating, resultData);
              }}
            >
              Confirm Rating
            </button>
          </div>
        )}

        <div
          className={`thank-you-message ${isRatingSubmitted ? "visible" : ""}`}
        >
          Thanks for your feedback! The cosmic bureaucracy appreciates it.
        </div>
      </div>
    );
  };

  //---------------------------------------------------------------------------

  //                                   HTML

  //---------------------------------------------------------------------------

  return (
    <div className="phone-container">
      {/* Phone UI elements */}
      <div className="phone-notch"></div>
      <div className="status-bar">
        <div className="status-bar-left">
          <span className="time">{formatTime()}</span>
        </div>
        <div className="status-bar-right">
          <span className="signal">📶</span>
          <span className="battery">🔋</span>
        </div>
      </div>

      {/* Chat header */}
      <div className="chat-header">
        <div className="avatar">
          <img
            src="/quizlogo.png"
            alt="Quiz Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
        </div>
        <div className="header-info">
          <div className="header-name">Unknown Number</div>
          <div className="header-status">Online now</div>
        </div>
        <div className="header-icons">
          <span>📞</span>
          <span>⋮</span>
        </div>
      </div>

      {/* Message container */}
      <div className="message-container" ref={messageContainerRef}>
        {messages.map((msg, index) => (
          <div
            key={`${msg.id}-${index}`}
            className={`message-row ${
              msg.sender === "user" ? "message-row-user" : "message-row-god"
            }`}
          >
            {msg.sender === "god" ? (
              msg.isImage ? (
                <div className="animate-message">
                  {getCreatureImage(msg.creature, msg.imageUrl)}
                </div>
              ) : msg.isRating ? (
                renderStarRating(msg.result)
              ) : (
                <div className="message message-god">{msg.text}</div>
              )
            ) : (
              <div className="message message-user">{msg.text}</div>
            )}
          </div>
        ))}

        {/* Loading animation */}
        {isLoading && renderLoadingDots()}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Options or input area */}
      {!showResult ? (
        renderOptions()
      ) : (
        <div className="input-container">
          <input
            type="text"
            placeholder="Type 'restart' to try again..."
            className="input"
            onKeyDown={handleUserInput}
          />
          <button
            className="send-button"
            onClick={() => {
              const input = document.querySelector(".input");
              if (input && input.value.toLowerCase().includes("restart")) {
                handleRestart();
                input.value = "";
              }
            }}
          >
            ➤
          </button>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fullscreen-modal"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={fullscreenImage}
            alt="Fullscreen view"
            className="fullscreen-image"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="close-button"
            onClick={() => setFullscreenImage(null)}
          >
            ×
          </div>
        </div>
      )}
    </div>
  );
};

export default ReincarnationQuiz;
