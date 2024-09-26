const path = "/v1/chat/completions";
const headers = {
  "Content-Type": "application/json",
};

window.onload = async () => {
  let url = `http://localhost:8099${path}`;
  // Start copilot service
  const loadingContainer = document.getElementById("loading-container");
  const chatbotContainer = document.getElementById("chatbot-container");
  try {
    const response = await fetch(`${API_BLOG_URL}/api/blog/copilot`);
    const copilotUrl = await response.text();
    console.log(copilotUrl);
    url = `${copilotUrl}${path}`;
    loadingContainer.classList.add("hidden");
    chatbotContainer.classList.remove("hidden");
  } catch {
    loadingContainer.classList.remove("animated-pulse");
    document.getElementById("loading-container-image").classList.add("hidden");
    document
      .getElementById("loading-container-image-error")
      .classList.remove("hidden");
  }

  // select DOM elements
  const messageInput = document.getElementById("message-input");
  const messageContainer = document.getElementById("message-container");
  const currentPost = document.getElementById("current-post");
  const currentPostEdit = document.getElementById("current-post-edit");
  const currentPostError = document.getElementById("current-post-error");
  const messageLoading = document.getElementById("message-loading");

  // load stored chat
  let chatHistory = [];
  try {
    chatHistory = JSON.parse(localStorage.getItem("chat-history"));
    chatHistory.forEach((message) => {
      addMessage(message.content, message.role, false);
    });
    const historyPost = localStorage.getItem("history-post");
    currentPost.innerHTML = historyPost;
    currentPostEdit.value = historyPost;
  } catch {
    localStorage.setItem("chat-history", JSON.stringify([]));
    localStorage.setItem("history-post", "");
  }

  async function sendMessage(message) {
    addMessage(message, "user");
    messageInput.classList.add("hidden");
    messageLoading.classList.remove("hidden");
    const body = JSON.stringify({
      model: "lmstudio-community/gemma-2-9b-it-GGUF",
      messages: [
        {
          role: "user",
          content: `{'user_message':'${message}', 'current_post': '${currentPost.innerHTML}'}`,
        },
      ],
      temperature: 0.7,
      max_tokens: -1,
      stream: false,
    });
    try {
      console.log("body", body);
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
      });
      const responseJson = await response.json();
      messageAssistantResponse(responseJson);
      currentPostError.classList.add("hidden");
    } catch {
      currentPostError.classList.remove("hidden");
    }
    messageInput.classList.remove("hidden");
    messageLoading.classList.add("hidden");
  }

  function messageAssistantResponse(responseJson) {
    const jsonString = responseJson.choices[0].message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/\n/g, "");
    const jsonObject = JSON.parse(jsonString);
    currentPost.innerHTML = jsonObject.current_post;
    currentPostEdit.value = jsonObject.current_post;
    localStorage.setItem("history-post", currentPost.innerHTML);
    addMessage(jsonObject.assistant_message, "assistant");
  }

  function addMessage(message, role, save = true) {
    const newMessage = document.createElement("div");
    if (role === "user") {
      newMessage.classList.add("user-message");
    } else {
      newMessage.classList.add("assistant-message");
    }
    newMessage.innerHTML = message;
    messageContainer.appendChild(newMessage);
    messageContainer.scrollTop = messageContainer.scrollHeight;
    if (save) {
      chatHistory.push({ role: role, content: message });
      localStorage.setItem("chat-history", JSON.stringify(chatHistory));
    }
  }

  // edit content post
  currentPostEdit.addEventListener("input", () => {
    currentPost.innerHTML = currentPostEdit.value;
    localStorage.setItem("history-post", currentPostEdit.value);
  });

  // preview - edit button event
  const previewButton = document.getElementById("preview-button");
  const editButton = document.getElementById("edit-button");
  previewButton.addEventListener("click", async () => {
    editButton.classList.remove("bg-purple-400/50");
    if (!previewButton.classList.contains("bg-purple-400/50")) {
      previewButton.classList.add("bg-purple-400/50");
      currentPost.classList.remove("hidden");
      currentPostEdit.classList.add("hidden");
    }
  });
  editButton.addEventListener("click", async () => {
    previewButton.classList.remove("bg-purple-400/50");
    if (!editButton.classList.contains("bg-purple-400/50")) {
      editButton.classList.add("bg-purple-400/50");
      currentPost.classList.add("hidden");
      currentPostEdit.classList.remove("hidden");
    }
  });

  // send button event
  const sendMessageButton = document.getElementById("send-message-button");
  sendMessageButton.addEventListener("click", async () => {
    sendMessage(messageInput.value);
    messageInput.value = "";
  });

  // reset button event
  const resetButton = document.getElementById("reset-button");
  resetButton.addEventListener("click", async () => {
    localStorage.setItem("chat-history", JSON.stringify([]));
    localStorage.setItem("history-post", "");
    window.location.reload();
    //window.location.href = window.location.href;
  });
};
