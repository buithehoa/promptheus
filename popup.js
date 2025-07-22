// popup.js

// Global state variables
let allPrompts = [];
let currentSelectedPromptId = null;
let currentAutocompleteIndex = -1; // For keyboard navigation in autocomplete

// DOM Elements
const searchInput = document.getElementById('search-input');
const tagAutocompleteSuggestions = document.getElementById('tag-autocomplete-suggestions');
const newPromptButton = document.getElementById('new-prompt-button');
const promptListView = document.getElementById('prompt-list-view');
const promptList = document.getElementById('prompt-list');
const noPromptsMessage = document.getElementById('no-prompts-message');
const promptDetailView = document.getElementById('prompt-detail-view');
const detailPromptTitle = document.getElementById('detail-prompt-title');
const detailPromptContent = document.getElementById('detail-prompt-content');
const detailPromptTags = document.getElementById('detail-prompt-tags');
const copyPromptButton = document.getElementById('copy-prompt-button');
const editPromptButton = document.getElementById('edit-prompt-button');
const deletePromptButton = document.getElementById('delete-prompt-button');
const backToListButton = document.getElementById('back-to-list-button');
const promptFormView = document.getElementById('prompt-form-view');
const formTitle = document.getElementById('form-title');
const formPromptId = document.getElementById('form-prompt-id');
const formPromptTitle = document.getElementById('form-prompt-title');
const formPromptContent = document.getElementById('form-prompt-content');
const formPromptTags = document.getElementById('form-prompt-tags');
const savePromptButton = document.getElementById('save-prompt-button');
const cancelFormButton = document.getElementById('cancel-form-button');

/**
 * Logs messages to the console with a prefix for easy identification.
 * @param {string} message - The message to log.
 * @param {string} type - The type of log (e.g., 'info', 'error', 'warn').
 * @param {any} data - Optional data to log.
 */
function log(message, type = 'info', data = null) {
    const prefix = '[PromptManager Popup]';
    if (type === 'error') {
        console.error(`${prefix} ERROR: ${message}`, data);
    } else if (type === 'warn') {
        console.warn(`${prefix} WARN: ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`, data);
    }
}

/**
 * Displays a user-friendly message in the UI.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showUIMessage(message, type) {
    // For a simple popup, we can use an alert or a temporary message div.
    // For this implementation, we'll log and use a simple alert for critical errors.
    log(`UI Message (${type}): ${message}`, 'info');
    if (type === 'error') {
        alert(`Error: ${message}`);
    }
}

/**
 * Saves the current prompts array to Chrome storage.
 * @param {Array<Object>} prompts - The array of prompt objects to save.
 * @returns {Promise<void>} A promise that resolves when prompts are saved.
 */
async function savePrompts(prompts) {
    log('Attempting to save prompts to storage.', prompts);
    try {
        await chrome.storage.sync.set({ prompts: prompts });
        allPrompts = prompts; // Update global state after successful save
        log('Prompts saved successfully.');
    } catch (error) {
        log('Failed to save prompts to storage.', 'error', error);
        showUIMessage('Could not save prompts. Please try again.', 'error');
    }
}

/**
 * Loads prompts from Chrome storage.
 * @returns {Promise<Array<Object>>} A promise that resolves with the array of prompt objects.
 */
async function loadPrompts() {
    log('Attempting to load prompts from storage.');
    try {
        const data = await chrome.storage.sync.get('prompts');
        const loadedPrompts = data.prompts || [];
        allPrompts = loadedPrompts; // Update global state
        log('Prompts loaded successfully.', allPrompts);
        return allPrompts;
    } catch (error) {
        log('Failed to load prompts from storage.', 'error', error);
        showUIMessage('Could not load prompts. Please refresh the extension.', 'error');
        return [];
    }
}

/**
 * Switches the active view in the popup.
 * @param {string} viewId - The ID of the view to show (e.g., 'prompt-list-view', 'prompt-detail-view', 'prompt-form-view').
 */
function showView(viewId) {
    log(`Switching view to: ${viewId}`);
    const views = [promptListView, promptDetailView, promptFormView];
    views.forEach(view => {
        if (view) {
            if (view.id === viewId) {
                view.classList.add('active');
                view.classList.remove('hidden');
            } else {
                view.classList.remove('active');
                view.classList.add('hidden');
            }
        } else {
            log(`View element with ID ${viewId} not found.`, 'warn');
        }
    });
    log(`View switched to ${viewId}.`);
}

/**
 * Renders the list of prompts in the UI.
 * @param {Array<Object>} promptsToDisplay - The array of prompt objects to display.
 */
function renderPromptList(promptsToDisplay) {
    log('Rendering prompt list.', promptsToDisplay);
    promptList.innerHTML = ''; // Clear existing list

    if (!promptsToDisplay || promptsToDisplay.length === 0) {
        noPromptsMessage.style.display = 'block';
        log('No prompts to display.');
        return;
    } else {
        noPromptsMessage.style.display = 'none';
    }

    promptsToDisplay.forEach(prompt => {
        const listItem = document.createElement('li');
        listItem.className = 'prompt-item';
        listItem.dataset.id = prompt.id;
        listItem.innerHTML = `
            <div>
                <div class="prompt-item-title">${escapeHTML(prompt.title)}</div>
                <div class="prompt-item-preview">${escapeHTML(prompt.content.substring(0, 100))}...</div>
            </div>
            <div>
                <button id="view-prompt-button" class="icon-button">View</button>
            </div>
        `;
        promptList.appendChild(listItem);
    });
    log('Prompt list rendered.');
}

/**
 * Displays the details of a specific prompt.
 * @param {string} id - The ID of the prompt to display.
 */
function showPromptDetails(id) {
    log(`Showing details for prompt ID: ${id}`);
    const prompt = allPrompts.find(p => p.id === id);
    if (!prompt) {
        log(`Prompt with ID ${id} not found.`, 'error');
        showUIMessage('Prompt not found.', 'error');
        showView('prompt-list-view');
        return;
    }

    currentSelectedPromptId = id;
    detailPromptTitle.textContent = escapeHTML(prompt.title);
    detailPromptContent.textContent = escapeHTML(prompt.content); // Use textContent for safety
    detailPromptTags.innerHTML = '';
    if (prompt.tags && prompt.tags.length > 0) {
        prompt.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = escapeHTML(tag);
            detailPromptTags.appendChild(tagSpan);
        });
    } else {
        detailPromptTags.textContent = 'No tags';
    }

    showView('prompt-detail-view');
    log(`Prompt details displayed for ID: ${id}.`);
}

/**
 * Populates the form for editing an existing prompt.
 * @param {string} id - The ID of the prompt to edit.
 */
function editPrompt(id) {
    log(`Editing prompt ID: ${id}`);
    const prompt = allPrompts.find(p => p.id === id);
    if (!prompt) {
        log(`Prompt with ID ${id} not found for editing.`, 'error');
        showUIMessage('Prompt not found for editing.', 'error');
        showView('prompt-list-view');
        return;
    }

    formTitle.textContent = 'Edit Prompt';
    formPromptId.value = prompt.id;
    formPromptTitle.value = prompt.title;
    formPromptContent.value = prompt.content;
    formPromptTags.value = prompt.tags ? prompt.tags.join(', ') : '';

    showView('prompt-form-view');
    log(`Form populated for editing prompt ID: ${id}.`);
}

/**
 * Handles saving a new or updated prompt.
 */
async function handleSavePrompt() {
    log('Attempting to save prompt from form.');
    const id = formPromptId.value;
    const title = formPromptTitle.value.trim();
    const content = formPromptContent.value.trim();
    const tags = formPromptTags.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    if (!title || !content) {
        showUIMessage('Title and Content are required.', 'error');
        log('Validation failed: Title or Content missing.', 'warn');
        return;
    }

    if (id) {
        // Update existing prompt
        const promptIndex = allPrompts.findIndex(p => p.id === id);
        if (promptIndex > -1) {
            allPrompts[promptIndex] = { id, title, content, tags };
            log(`Prompt updated: ${id}`);
        } else {
            log(`Prompt with ID ${id} not found for update.`, 'error');
            showUIMessage('Error: Prompt not found for update.', 'error');
            return;
        }
    } else {
        // Add new prompt
        const newId = Date.now().toString(); // Simple unique ID
        allPrompts.push({ id: newId, title, content, tags });
        log(`New prompt added: ${newId}`);
    }

    await savePrompts(allPrompts);
    renderPromptList(allPrompts);
    showView('prompt-list-view');
    log('Prompt saved and list re-rendered.');
}

/**
 * Deletes a prompt after confirmation.
 * @param {string} id - The ID of the prompt to delete.
 */
async function handleDeletePrompt(id) {
    log(`Attempting to delete prompt ID: ${id}`);
    if (confirm('Are you sure you want to delete this prompt?')) {
        const initialLength = allPrompts.length;
        allPrompts = allPrompts.filter(p => p.id !== id);
        if (allPrompts.length < initialLength) {
            await savePrompts(allPrompts);
            renderPromptList(allPrompts);
            showView('prompt-list-view');
            log(`Prompt ID ${id} deleted successfully.`);
        } else {
            log(`Prompt with ID ${id} not found for deletion.`, 'warn');
            showUIMessage('Prompt not found for deletion.', 'error');
        }
    } else {
        log('Prompt deletion cancelled.');
    }
}

/**
 * Copies the given text to the clipboard.
 * @param {string} text - The text to copy.
 */
async function copyToClipboard(text) {
    log('Attempting to copy text to clipboard.');
    try {
        await navigator.clipboard.writeText(text);
        log('Text copied to clipboard successfully.');
        showUIMessage('Prompt content copied to clipboard!', 'success');
        window.close();
    } catch (err) {
        log('Failed to copy text to clipboard.', 'error', err);
        showUIMessage('Failed to copy text to clipboard. Please ensure clipboard permissions are granted.', 'error');
    }
}

/**
 * Performs search based on the input query.
 * @param {string} query - The search query.
 */
function performSearch(query) {
    log(`Performing search for query: "${query}"`);
    const lowerCaseQuery = query.toLowerCase();
    let filteredPrompts = [];

    if (lowerCaseQuery.startsWith('@')) {
        // Tag-based search
        const tagQuery = lowerCaseQuery.substring(1).trim();
        if (tagQuery === '') {
            filteredPrompts = allPrompts; // Show all if only '@' is typed
        } else {
            filteredPrompts = allPrompts.filter(prompt =>
                prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(tagQuery))
            );
        }
        log(`Tag search results:`, filteredPrompts);
    } else {
        // Full-text search
        filteredPrompts = allPrompts.filter(prompt =>
            prompt.title.toLowerCase().includes(lowerCaseQuery) ||
            prompt.content.toLowerCase().includes(lowerCaseQuery) ||
            (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
        );
        log(`Full-text search results:`, filteredPrompts);
    }
    renderPromptList(filteredPrompts);
}

/**
 * Gets all unique tags from the current prompts.
 * @returns {Array<string>} An array of unique tags.
 */
function getAvailableTags() {
    const tags = new Set();
    allPrompts.forEach(prompt => {
        if (prompt.tags) {
            prompt.tags.forEach(tag => tags.add(tag.toLowerCase()));
        }
    });
    return Array.from(tags);
}

/**
 * Renders tag autocomplete suggestions.
 * @param {string} input - The current input in the search bar.
 */
function renderTagAutocomplete(input) {
    log(`Rendering tag autocomplete for input: "${input}"`);
    tagAutocompleteSuggestions.innerHTML = '';
    tagAutocompleteSuggestions.classList.remove('visible');
    currentAutocompleteIndex = -1;

    if (!input.startsWith('@')) {
        return;
    }

    const tagQuery = input.substring(1).trim().toLowerCase();
    const availableTags = getAvailableTags();
    const filteredTags = availableTags.filter(tag => tag.includes(tagQuery));

    if (filteredTags.length === 0) {
        return;
    }

    filteredTags.forEach((tag, index) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'autocomplete-suggestion-item';
        suggestionItem.textContent = tag;
        suggestionItem.dataset.tag = tag;
        suggestionItem.addEventListener('click', () => {
            searchInput.value = `@${tag}`;
            performSearch(searchInput.value);
            tagAutocompleteSuggestions.classList.remove('visible');
        });
        tagAutocompleteSuggestions.appendChild(suggestionItem);
    });

    tagAutocompleteSuggestions.classList.add('visible');
    log(`Autocomplete suggestions rendered:`, filteredTags);
}

/**
 * Handles keyboard navigation for autocomplete suggestions.
 * @param {KeyboardEvent} event - The keyboard event.
 */
function handleAutocompleteKeydown(event) {
    const items = Array.from(tagAutocompleteSuggestions.children);
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentAutocompleteIndex = (currentAutocompleteIndex + 1) % items.length;
        updateAutocompleteSelection(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentAutocompleteIndex = (currentAutocompleteIndex - 1 + items.length) % items.length;
        updateAutocompleteSelection(items);
    } else if (event.key === 'Enter') {
        if (currentAutocompleteIndex > -1) {
            event.preventDefault();
            items[currentAutocompleteIndex].click();
        } else {
            // If Enter is pressed without selecting an autocomplete item, perform search
            performSearch(searchInput.value);
            tagAutocompleteSuggestions.classList.remove('visible');
        }
    } else if (event.key === 'Escape') {
        tagAutocompleteSuggestions.classList.remove('visible');
        currentAutocompleteIndex = -1;
    }
}

/**
 * Updates the visual selection of autocomplete items.
 * @param {Array<HTMLElement>} items - The autocomplete suggestion items.
 */
function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        if (index === currentAutocompleteIndex) {
            item.classList.add('selected');
            // Scroll into view if necessary
            item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * Initializes the popup by loading prompts and setting up event listeners.
 */
async function initializePopup() {
    log('Initializing Prompt Manager popup.');

    // Load prompts and render initial list
    await loadPrompts();
    renderPromptList(allPrompts);
    showView('prompt-list-view');

    // Event Listeners
    if (newPromptButton) {
        newPromptButton.addEventListener('click', () => {
            log('New Prompt button clicked.');
            formTitle.textContent = 'New Prompt';
            formPromptId.value = '';
            formPromptTitle.value = '';
            formPromptContent.value = '';
            formPromptTags.value = '';
            showView('prompt-form-view');
        });
    } else {
        log('New Prompt button not found.', 'error');
    }

    if (promptList) {
        promptList.addEventListener('click', (event) => {
            // Check if clicking the view button
            if (event.target.closest('#view-prompt-button')) {
                // Get the parent li element that contains the prompt ID
                const listItem = event.target.closest('.prompt-item');
                if (listItem && listItem.dataset.id) {
                    log(`View button clicked for prompt ID: ${listItem.dataset.id}`);
                    showPromptDetails(listItem.dataset.id);
                    // Stop propagation to prevent showing details
                    event.stopPropagation();
                }
            }
            // Check if clicking the content area (first div)
            else if (event.target.closest('.prompt-item > div:first-child') ||
                    event.target.closest('.prompt-item-title') ||
                    event.target.closest('.prompt-item-preview')) {
                const listItem = event.target.closest('.prompt-item');
                if (listItem && listItem.dataset.id) {
                    log(`Prompt content area clicked: ${listItem.dataset.id}`);
                    const promptId = listItem.dataset.id;
                    const prompt = allPrompts.find(p => p.id === promptId);
                    if (prompt) {
                        // Pass the actual content to copyToClipboard
                        copyToClipboard(prompt.content);
                    } else {
                        log(`Prompt with ID ${promptId} not found for copying.`, 'warn');
                        showUIMessage('Prompt not found for copying.', 'error');
                    }
                }
            }
        });
    } else {
        log('Prompt list not found.', 'error');
    }

    if (savePromptButton) {
        savePromptButton.addEventListener('click', handleSavePrompt);
    } else {
        log('Save Prompt button not found.', 'error');
    }

    if (cancelFormButton) {
        cancelFormButton.addEventListener('click', () => {
            log('Cancel Form button clicked.');
            showView('prompt-list-view');
        });
    } else {
        log('Cancel Form button not found.', 'error');
    }

    if (backToListButton) {
        backToListButton.addEventListener('click', () => {
            log('Back to List button clicked.');
            showView('prompt-list-view');
        });
    } else {
        log('Back to List button not found.', 'error');
    }

    if (copyPromptButton) {
        copyPromptButton.addEventListener('click', () => {
            log('Copy Prompt button clicked.');
            const prompt = allPrompts.find(p => p.id === currentSelectedPromptId);
            if (prompt) {
                copyToClipboard(prompt.content);
            } else {
                log('No prompt selected to copy.', 'warn');
                showUIMessage('No prompt selected to copy.', 'error');
            }
        });
    } else {
        log('Copy Prompt button not found.', 'error');
    }

    if (editPromptButton) {
        editPromptButton.addEventListener('click', () => {
            log('Edit Prompt button clicked.');
            if (currentSelectedPromptId) {
                editPrompt(currentSelectedPromptId);
            } else {
                log('No prompt selected to edit.', 'warn');
                showUIMessage('No prompt selected to edit.', 'error');
            }
        });
    } else {
        log('Edit Prompt button not found.', 'error');
    }

    if (deletePromptButton) {
        deletePromptButton.addEventListener('click', () => {
            log('Delete Prompt button clicked.');
            if (currentSelectedPromptId) {
                handleDeletePrompt(currentSelectedPromptId);
            } else {
                log('No prompt selected to delete.', 'warn');
                showUIMessage('No prompt selected to delete.', 'error');
            }
        });
    } else {
        log('Delete Prompt button not found.', 'error');
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            performSearch(query);
            renderTagAutocomplete(query);
        });
        searchInput.addEventListener('keydown', handleAutocompleteKeydown);
        // Hide autocomplete when clicking outside
        document.addEventListener('click', (event) => {
            if (!tagAutocompleteSuggestions.contains(event.target) && event.target !== searchInput) {
                tagAutocompleteSuggestions.classList.remove('visible');
                currentAutocompleteIndex = -1;
            }
        });
    } else {
        log('Search input not found.', 'error');
    }

    // Listen for commands from background script (keyboard shortcuts)
    chrome.commands.onCommand.addListener((command) => {
        log(`Command received: ${command}`);
        if (command === 'activate-search') {
            searchInput.focus();
            searchInput.select();
        } else if (command === 'copy-prompt') {
            if (currentSelectedPromptId) {
                const prompt = allPrompts.find(p => p.id === currentSelectedPromptId);
                if (prompt) {
                    copyToClipboard(prompt.content);
                }
            } else {
                showUIMessage('No prompt selected to copy with shortcut.', 'warn');
            }
        } else if (command === 'create-prompt') {
            newPromptButton.click(); // Simulate click on new prompt button
        }
    });

    log('Prompt Manager popup initialized successfully.');
}

/**
 * Basic HTML escaping function to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Initialize the popup when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializePopup);
log('DOMContentLoaded event listener added.');