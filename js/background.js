/**
 * Adds listeners for needed events.
 */
browser.runtime.onInstalled.addListener(handleStartup);
browser.runtime.onStartup.addListener(handleStartup);
browser.alarms.onAlarm.addListener(handleAlarm);
browser.runtime.onMessage.addListener(handleMessage);

/**
 * Handles messages from content scripts.
 */
async function handleMessage(data)
{
	if (data.type === "openTab")
	{
		createTab(data.url);

		return "done";
	};

    return undefined;
};

/**
 * Handles alarms.
 */
async function handleAlarm(alarm)
{
    if (alarm.name !== "update-firefox-release-info")
        return;

    const updated_stamp = browser.storage.local.get("last_update");

    if (updated_stamp < Date.now() - 1000 * 59 * 60)
        return;

    await updateStorage();

    return;
};

/**
 * Handles browser startup.
 */
async function handleStartup()
{
    await updateStorage();
    scheduleUpdates();
    
    return;
};

/**
 * Schedules updates for storage.
 */
function scheduleUpdates()
{
    browser.alarms.create("update-firefox-release-info", {
        delayInMinutes: 60,
        periodInMinutes: 60,
    });

    return;
};

/**
 * Updates data in storage.
 */
async function updateStorage()
{
    const raw_data = await fetchReleases();

	if (!raw_data)
		return;

    const parsed_data = parseReleases(raw_data),
    sorted_data = sortReleases(parsed_data);

    await browser.storage.local.set({releases: sorted_data, last_update: Date.now()});

    return;
};

/**
 * Sorts out releases using {@link releaseCompare} and {@link Object.keys}.
 * @param parsed_releases Releases that are already parsed.
 */
function sortReleases(parsed_releases)
{
    let sorted_releases = {};

    for (const key of Object.keys(parsed_releases))
        sorted_releases[key] = parsed_releases[key].sort(releaseCompare);
    
    return sorted_releases;
};

/**
 * Compares releases to sort them properly with localeCompare function.
 * @param {string} first Version 1.
 * @param {string} second Version 2.
 */
function releaseCompare(first, second)
{
    return first.localeCompare(second, undefined, { numeric: true, sensivity: "base" });
};

/**
 * Parse releases and transpile it into JSON.
 * @param releases_json JSON data of releases.
 */
function parseReleases(releases_json)
{
    let parsed_releases = {};

    for (const release of releases_json)
    {
        if (!release.product || !release.channel || !release.version)
            continue;

        if (release.version.split(".").length === 0)
            continue;

        if (isNaN(parseInt(release.version[0])))
            continue;

        const platformChannelCode = toPlatformChannelCode(release);

        if (!platformChannelCode)
            continue;

        if (usesBannedWords(platformChannelCode))
            continue;

        parsed_releases[platformChannelCode]
            ? parsed_releases[platformChannelCode].push(release.version)
            : parsed_releases[platformChannelCode] = [release.version];
    };

    return parsed_releases;
};

/**
 * Checks platform_channel code for banned words. Returns true if finds word that is not allowed.
 * @param {string} code platform_channel code.
 * @returns {boolean}
 */
function usesBannedWords(code)
{
    const bannedWords = [ "thunderbird", "os" ];

    for (const word of code.split("_"))
        if (bannedWords.indexOf(word) !== -1)
            return true;

    return false;
};

/**
 * Transpiles release object into stringified platform_channel code.
 * @param release Release object.
 * @returns platform_channel code or undefined.
 */
function toPlatformChannelCode(release)
{
    if (release.product.toLowerCase() === "firefox for android")
        return "android_" + release.channel.toLowerCase();

    if (release.product.toLowerCase() === "firefox for ios")
        return "ios_" + release.channel.toLowerCase();

    if (release.product.toLowerCase() === "firefox")
        return "desktop_" + release.channel.toLowerCase();

    return undefined;
};

/**
 * Fetches releases from Mozilla's Nucleus instance.
 * @returns Array of releases.
 */
async function fetchReleases()
{
	let toReturn;

	try
	{
		toReturn = await (await fetch("https://nucleus.mozilla.org/rna/releases/?format=json")).json();
	}
	catch (e)
	{
		toReturn = undefined;
	};

    return toReturn;
};

/**
 * Creates tab with defined URL.
 * @param {string} url
 * @returns Tab object.
 */
async function createTab(url)
{
	return browser.tabs.create({url});
};