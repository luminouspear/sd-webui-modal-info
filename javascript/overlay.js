document.addEventListener("DOMContentLoaded", (event) => {
  const targetDivId = "#lightboxModal";
  const lightboxModal = document.querySelector(targetDivId);
  let lastSelectedTab = 0;
    
  function setupObserversForDynamicElements() {
    const bodyElement = document.querySelector("body");
    const promptContainerMutationOptions = { childList: true, subtree: true };
    const thumbnailGalleryContainerMutationOptions = {
      childList: true,
      subtree: true,
      attributues: true,
      attributeFilter: ["class"],
    };

    observeLightboxModal();

    createObserverForNode(
      "#html_info_txt2img",
      bodyElement,
      promptContainerMutationOptions,
      false,
      function (addedNode) {
        observeDivForPromptChanges(addedNode);
      }
    );
    createObserverForNode(
      "#html_info_img2img",
      bodyElement,
      promptContainerMutationOptions,
      false,
      function (addedNode) {
        observeDivForPromptChanges(addedNode);
      }
    );
    createObserverForNode(
      "#txt2img_gallery > div > .thumbnails",
      bodyElement,
      promptContainerMutationOptions,
      false,
      function (addedNode) {
        const thumbnailsObserver = new MutationObserver((mutationsList) => {
          getThumbnailCount("#txt2img_gallery > div > .thumbnails");
        });

        thumbnailsObserver.observe(
          addedNode,
          thumbnailGalleryContainerMutationOptions
        );
      }
    );
    createObserverForNode(
      "#img2img_gallery > div > .thumbnails",
      bodyElement,
      promptContainerMutationOptions,
      false,
      function (addedNode) {
        const thumbnailsObserver = new MutationObserver((mutationsList) => {
          getThumbnailCount("#img2img_gallery > div > .thumbnails");
        });

        thumbnailsObserver.observe(
          addedNode,
          thumbnailGalleryContainerMutationOptions
        );
      }
    );
    const isImgObserverPersistent = false;

    createObserverForNode(
      "#div.preview > img",
      bodyElement,
      promptContainerMutationOptions,
      isImgObserverPersistent,
      function (mainImageNode) {
        addListenerToMainImage(mainImageNode);
      }
    );
  }

  function createObserverForNode(
    nodeId,
    parent,
    options,
    persistent = false,
    callback
  ) {
    const nodeObserver = new MutationObserver((mutations, observer) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((addedNode) => {
          if (addedNode.matches && addedNode.matches(nodeId)) {
            callback(addedNode);
            if (persistent) {
              return;
            } else {
              observer.disconnect();
              return;
            }
          }
        });
      });
    });
    nodeObserver.observe(parent, options);
  }
  
  function observeLightboxModal() {
    const lightboxObserver = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "attributes" &&
          mutation.attributeName === "style") {
          requestAnimationFrame(() => {
            if (isElementVisible(mutation.target)) {

              const overlayDiv = createOverlayDiv();

              lightboxModal.appendChild(overlayDiv);

              createToolbarInfo();
              //observer.disconnect()
            } else {
              //clean up elements added in
              removeModalInfoElements();
            }
          });
        }
      }
    });

    if (lightboxModal) {
      const modalConfig = { attributes: true, attributeFilter: ["style"] };
      lightboxObserver.observe(lightboxModal, modalConfig);
    }

    
  }

  function observeDivForPromptChanges(container) {
    if (container) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((addedNode) => {
            if (addedNode.nodeName === "P") {
              updatePromptInfo();
            }
          });
        });
      });
      observer.observe(container, { childList: true });
    }
  }

  function updatePromptInfo() {
    const prompt = getPromptFromInterface()
    const promptParagraphs = document.querySelectorAll(".prompt-contents");
    if (promptParagraphs) {
      promptParagraphs.forEach((paragraph) => {
        while (paragraph.firstChild) {
          paragraph.removeChild(paragraph.firstChild)
        }
        const highlightedPrompt = getHighlightedPrompt(prompt[paragraph.dataset.index]);
        paragraph.appendChild(highlightedPrompt)
      });
    }
  }

  function getPromptFromInterface() {
    const promptText = document.querySelector(getVisibleTabPrompt()).textContent;
    // This regular expression matches on a newline or the specific pattern
    const regex =/(?:\nNegative prompt: |\n)/;
    return promptText.split(regex).filter(line => line.trim());
  }
 
  function createOverlayDiv() {
    const prompt = getPromptFromInterface();
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "lightbox-modal-overlay modal-open";

    const buttonsContainerDiv = document.createElement("div");
    buttonsContainerDiv.className = "modal-overlay-buttons-container";

    const ulButtonsList = document.createElement("ul");
    ulButtonsList.className = "modal-overlay-buttons-list";

    const buttons = ["Prompt", "Negative Prompt", "Generation Info"];

    //create buttons and paragraphs
    for (let index = 0; index < buttons.length; index++) {
      const liButton = document.createElement("li");
      liButton.className = "modal-overlay-prompt-button";
      liButton.textContent = buttons[index];
      liButton.dataset.index = index;

      const promptParagraph = document.createElement('p')
      promptParagraph.classList.add('prompt-contents')
      promptParagraph.dataset.index = index;

      const highlightedPrompt = getHighlightedPrompt(prompt[index])

      promptParagraph.appendChild(highlightedPrompt)

      if (index === lastSelectedTab) {
        liButton.classList.add("active");
        promptParagraph.classList.add("active");
      } else {
        liButton.classList.remove("active");
        promptParagraph.classList.remove("active");
      }

      liButton.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const val = this.dataset.index;
        document
          .querySelectorAll(".modal-overlay-prompt-button")
          .forEach((button) => {
            button.classList.remove("active");
            if (button.dataset.index === val) {
              button.classList.add("active");
            }
          });
        //same for prompt-contents
        document.querySelectorAll(".prompt-contents").forEach((paragraph) => {
          paragraph.classList.remove("active");
          if (paragraph.dataset.index === val) {
            paragraph.classList.add("active");
          }
        });

        //then store val in 'lastSelectedTab' for future reference.
        lastSelectedTab = parseInt(val);
      });

      ulButtonsList.appendChild(liButton);
      overlayDiv.appendChild(promptParagraph);
      
    }

    buttonsContainerDiv.appendChild(ulButtonsList);
   
    overlayDiv.appendChild(buttonsContainerDiv);

    overlayDiv.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });

    updatePromptInfo()
    return overlayDiv;
  }

  function getHighlightedPrompt(inputString) {
    const delimiter = ","
    const fragment = document.createDocumentFragment();

    const segments = inputString.replace(/\s+/g, ' ').trim().split(delimiter)

    segments.forEach((segment, index, array) => {
      const span = document.createElement('span')
      span.className = 'prompt-tag';
      span.textContent = segment.trim()

      fragment.appendChild(span)

      if (index < array.length - 1) {
        fragment.appendChild(document.createTextNode(', '))
      }
    })
  
    return fragment;
  }
 
  function createToolbarInfo() {
    const saveMessage = document.createElement("span");

    saveMessage.className = "modal-save-message";
    saveMessage.textContent = "Image saved.";

    const modalSave = document.querySelector("#modal_save");
    // Insert the new div into the DOM after the "modalSave" element
    if (modalSave) {
      modalSave.insertAdjacentElement("afterend", saveMessage);
      modalSave.addEventListener(
        "click",
        saveButtonMessageHandler(saveMessage),
        true
      );
      // insertModalCounter(saveMessage);

      const modalCounter = document.createElement("div");
      modalCounter.className = "modal-counter"
      saveMessage.insertAdjacentElement("afterend", modalCounter)

      const selectedGallery = isElementVisible(
        document.querySelector("#txt2img_gallery > div > .thumbnails")
      )
        ? "#txt2img_gallery > div > .thumbnails"
        : "#img2img_gallery > div > .thumbnails";
      getThumbnailCount(selectedGallery);
      

    }
  }

  function saveButtonMessageHandler(saveMessage) {
    return function () {
      saveMessage.style.opacity = "1";
      setTimeout(function () {
        saveMessage.style.opacity = "0";
      }, 1000);
    };
  }


  function getThumbnailCount(selector) {
    const container = document.querySelector(selector);
    let currentThumbnailIndex = 0;
    let totalThumbnails = 0;

    if (container) {
      const childDivs = container.querySelectorAll(".thumbnail-item");

      totalThumbnails = childDivs.length;

      childDivs.forEach((div, index) => {
        if (div.classList.contains("selected")) {
          currentThumbnailIndex = index;
          updateModalCounter(currentThumbnailIndex, totalThumbnails);
        }
      });
    } else {
      updateModalCounter(currentThumbnailIndex, totalThumbnails);
    }
  }

  function updateModalCounter(currentThumbnailIndex, totalThumbnails) {
    const modalCounter = document.querySelector(".modal-counter");
   if (modalCounter) {
     modalCounter.textContent = `${
       currentThumbnailIndex + 1
     } of ${totalThumbnails}`;
     const updatedPrompt = getPromptFromInterface();
     updatePromptInfo(updatedPrompt);
   }
  }

  function addListenerToMainImage(imageContainer) {
    imageContainer.addEventListener(
      "click",
      function () {
        const selectedGallery = isElementVisible(
          document.querySelector("#txt2img_gallery > div > .thumbnails")
        )
          ? "#txt2img_gallery > div > .thumbnails"
          : "#img2img_gallery > div > .thumbnails";
        getThumbnailCount(selectedGallery);
      },
      true
    );
  }

  function getVisibleTabPrompt() {
    const selectedTab = isElementVisible(
      document.querySelector("#html_info_txt2img")
    )
      ? "#html_info_txt2img"
      : "#html_info_img2img";
    return selectedTab;
  }

  function isElementVisible(el) {
    const style = window.getComputedStyle(el);
    const isHidden = el.offsetParent === null && style.display === "none";
    const hasNoSize = el.offsetWidth === 0 && el.offsetHeight === 0;
    return !isHidden && !hasNoSize && style.opacity !== 0;
  }
  
  function removeModalInfoElements() {
  const modalSave = document.querySelector('#modal_save');
  modalSave.removeEventListener('click', saveButtonMessageHandler);


  const elementsToRemove = [
    ".lightbox-modal-overlay",
    ".modal-save-message",
    ".modal-counter",
    ".modal-overlay-buttons-container",
    ".modal-overlay-prompt-button",
    ".prompt-contents",
    ".modal-save-message",
  ];

  for (const elId in elementsToRemove) {

    const foundElements = document
      .querySelectorAll(elementsToRemove[elId])
      .forEach((element) => {
        if (element)
          element.remove();
      });
  }
}

  setupObserversForDynamicElements();
});


