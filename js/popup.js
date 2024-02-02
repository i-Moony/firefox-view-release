/**
 * Gets data in extension's storage.
 */
const storage = (await browser.storage.local.get("releases")).releases,

platformsAndChannels = detectChannelsAndPlatforms(),

allSelects = document.getElementsByTagName("select"),
platformSelect = document.getElementById("select-platform"),
channelSelect = document.getElementById("select-channel"),
versionSelect = document.getElementById("select-version"),

submitButton = document.getElementById("go"),

form = document.getElementById("view-release");

checkStorage();
setupFirstSelect();
listenToPlatformSelect();
listenToChannelSelect();
listenToVersionSelect();
listenToFormSubmit();

/**
 * Checks if storage is empty.
 */
function checkStorage()
{
	if (storage)
		return;

	for (const select of allSelects)
		select.children[0].textContent = "No Internet Connection!";

	return;
};

/**
 * Sets up first select with options.
 */
function setupFirstSelect()
{
	if (!storage)
		return;

	for (const key of Object.keys(platformsAndChannels))
		attachOptionToSelect(platformSelect, parseId(key), key);

	return;
};

/**
 * Adds listener to platform select Change Event.
 */
function listenToPlatformSelect()
{
	if (!storage)
		return;

	platformSelect.addEventListener("change", handlePlatformSelectUpdate);

	return;
};

/**
 * Handles platform select Change Evenet.
 */
function handlePlatformSelectUpdate()
{
	const channels = platformsAndChannels[platformSelect.value];

	if (!channels)
	{
		channelSelect.replaceChildren(createDefaultOption("Select Platform First"));
		handleChannelSelectUpdate();

		return;
	};

	channelSelect.replaceChildren(createDefaultOption("Select Channel"), ...createOptions(channels, true));
	handleChannelSelectUpdate();

	return;
};

/**
 * Adds listener to channel select Change Event.
 */
function listenToChannelSelect()
{
	if (!storage)
		return;

	channelSelect.addEventListener("change", handleChannelSelectUpdate);

	return;
};

/**
 * Handles channel select Change Event.
 */
function handleChannelSelectUpdate()
{
	const platformBranchCode = platformSelect.value + "_" + channelSelect.value;

	const versions = storage[platformBranchCode],
	options = createOptions(versions);

	if (options.length === 0)
	{
		versionSelect.replaceChildren(createDefaultOption("Select Channel First"));
		handleVersionSelectChange();

		return;
	};

	versionSelect.replaceChildren(createDefaultOption("Select Version"), ...options);
	handleVersionSelectChange();

	return;
};

/**
 * Adds listener to version select Change Event.
 */
function listenToVersionSelect()
{
	if (!storage)
		return;

	versionSelect.addEventListener("change", handleVersionSelectChange);

	return;
};

/**
 * Handles version select Change Event.
 */
function handleVersionSelectChange()
{
	versionSelect.value === "default"
		? submitButton.classList.add("hidden")
		: submitButton.classList.remove("hidden");

	return;
};

/**
 * Adds listener to form Submit Event.
 */
function listenToFormSubmit()
{
	if (!storage)
		return;

	const element = document.getElementById("view-release");

	element.addEventListener("submit", handleFormSubmit);

	return;
};

/**
 * Handles form Submit Event.
 */
function handleFormSubmit(event)
{
	event.preventDefault();

	if (versionSelect.value === "default")
		return;

	let link = "https://www.mozilla.org/en-US/firefox/";

	if (platformSelect.value !== "desktop")
		link += platformSelect.value + "/";

	link += versionSelect.value + "/";

	if (platformSelect.value === "desktop" && channelSelect.value === "aurora" && parseInt(versionSelect.value.split(".")[0]) < 29)
	{
		link += "auroranotes" + "/";
	}
	else
	{
		link += "releasenotes" + "/";
	};

	browser.runtime.sendMessage({type: "openTab", url: link});

	window.close();

	return;
};

/**
 * Creates option from given array of values.
 * @param arrayOfOptions Array of strings.
 * @param {boolean} parse Option to parse input with {@link parseId} function.
 */
function createOptions(arrayOfOptions, parse = false)
{
	if (!arrayOfOptions || arrayOfOptions.length === 0)
		return [];

	const elements = [];

	for (const option of arrayOfOptions)
		elements.push(createOption(parse ? parseId(option) : option, option));

	return elements;
};

/**
 * Attach option to select.
 * @param select Select element.
 * @param {string} name Option name.
 * @param {string} value Option value.
 */
function attachOptionToSelect(select, name, value)
{
	select.appendChild(createOption(name, value));

	return;
};

/**
 * Creates option element that is selected by default and hidden from user.
 * @param {string} name Name for option.
 */
function createDefaultOption(name)
{
	const element = createOption(name, "default");

	element.setAttribute("disabled", "");
	element.setAttribute("hidden", "");
	element.setAttribute("selected", "");

	return element;
};

/**
 * Creates option element.
 * @param {string} name Name for option.
 * @param {string} value Value for option.
 */
function createOption(name, value)
{
	const element = document.createElement("option");

	element.value = value;
	element.textContent = name;

	return element;
};

/**
 * Extracts platforms and their channels from storage.
 *
 * It works somehow like {@link detectPlatforms}.
 *
 * Returns object-map of platforms-channels.
 */
function detectChannelsAndPlatforms()
{
	const platforms = detectPlatforms();

	let map = {};

	for (const platform of platforms)
	{
		const keys = Object.keys(storage).filter((key) => key.startsWith(platform)).map((key) => key.split("_")[1]);

		map[platform] = keys;
	};

	return map;
};

/**
 * Extracts platforms from storage object.
 *
 * It gets storage objects keys and splits them to words. First word is platform.
 */
function detectPlatforms()
{
	const firstWords = Object.keys(storage).map((val) => val.split("_")[0]);

	return [...new Set(firstWords)];
};

/**
 * Parses platform and channel IDs.
 *
 * If ID is found in pre-defined map it is returned. Else returnned word with capitalized first letter.
 *
 * @param {string} id
 */
function parseId(id)
{
	const map =
	{
		esr: "ESR",
		aurora: "Aurora (Legacy)",
		ios: "iOS",
	};

	return map[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
};
