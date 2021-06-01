const { a, em, strong } = require("hyperaxe");

const dscrp = {
  en: {
    // navbar items
    extended: "Extended",
    extendedDescription: [
      "Posts from ",
      strong("people you don't follow"),
      ", sorted by recency. When you follow someone you may download messages from the people they follow, and those messages show up here.",
    ],
   
    latest: "Latest",
    latestDescription:
      "Posts from yourself and people you follow, sorted by recency.",
    
    summaries: "Summaries",
    summariesDescription: [
      strong("Topics and some comments"),
      " from yourself and people you follow, sorted by recency. Select the timestamp of any post to see the rest of the thread.",
    ],
   
    profile: "Profile",
    manualMode: "Manual Mode",
    mentions: "Mentions",
    mentionsDescription: [
      strong("Posts that mention you"),
      " from ",
      strong("anyone"),
      " sorted by recency. Sometimes people may forget to @mention you, and those posts won't show up here.",
    ],
    private: "Private",
    privateDescription: [
      "The latest comment from ",
      strong("private threads that include you"),
      ", sorted by recency. Private posts are encrypted for your public key, and have a maximum of 7 recipients. Recipients cannot be added after the thread has started. Select the timestamp to view the full thread.",
    ],
    search: "Search",
    imageSearch: "Image Search",
    settings: "Settings",
    // post actions
    comment: "Comment",
    subtopic: "Subtopic",
    json: "JSON",
    // relationships
    unfollow: "Unfollow",
    follow: "Follow",
    block: "Block",
    unblock: "Unblock",
    newerPosts: "Newer posts",
    olderPosts: "Older posts",
    feedRangeEmpty: "The given range is empty for this feed. Try viewing the ",
    seeFullFeed: "full feed",
    feedEmpty: "The local client has never seen posts from this account.",
    beginningOfFeed: "This is the beginning of the feed",
    noNewerPosts: "No newer posts have been received yet.",
    relationshipNotFollowing: "No one is following the other",
    relationshipTheyFollow: "They follow you",
    relationshipMutuals: "You are mutuals",
    relationshipFollowing: "You are following",
    relationshipYou: "This is you",
    relationshipBlocking: "You are blocking",
    relationshipBlockingPost: "This message hides content from a blocked user.",
    relationshipNone: "You are neither following or blocking",
    relationshipConflict: "You are somehow both following and blocking",
    // author view
    viewLikes: "View likes",
    // likes view
    likedBy: "'s likes",
    // composer
    attachFiles: "Attach files",
    mentionsMatching: "Matching Mentions",
    preview: "Preview",
    publish: "Publish",
    contentWarningPlaceholder: "Optional content warning for this post",
    publishCustomDescription: [
      "Publish a custom message by entering ",
      a({ href: "https://en.wikipedia.org/wiki/JSON" }, "JSON"),
      " below. This may be useful for prototyping or publishing messages that Reddito doesn't support. This message cannot be edited or deleted.",
    ],
    commentWarning: [
      " Published comments cannot be edited or deleted. To respond to an individual message, select ",
      strong("subtopic"),
      " instead.",
    ],
    commentPublic: "public",
    commentPrivate: "private",
    commentLabel: ({ publicOrPrivate }) => [
      "Write a ",
      strong(`${publicOrPrivate} comment`),
      " on this thread",
      ". Preview shows attached media.",
    ],
    publishLabel: ({ markdownUrl, linkTarget }) => [
      "Write a new public post",
      
      ". Published posts cannot be edited or deleted. Preview to see attached media before publishing.",
    ],
    
    publishBasicInfo: ({ href }) => [
      "If you're not an advanced user, you should ",
      a({ href }, "publish a post"),
      ".",
    ],
    publishCustom: "Publish custom",

    subtopicLabel: ({ markdownUrl }) => [
      "Create a ",
      strong("public subtopic"),
      " of this message with",
      ". Messages cannot be edited or deleted. To respond to an entire thread, select ",
      strong("comment"),
      " instead. Preview shows attached media.",
    ],
    // settings
    settingsIntro: ({ readmeUrl, version }) => [
      `You're using Reddito ${version}. Check out `,
      a({ href: readmeUrl }, "the readme"),
      ", configure your theme, or view debugging information below.",
    ],
   

    status: "Status",
    peerConnections: "Peer Connections",
    connectionsIntro:
      "Your computer is syncing data with these other computers. It will connect to any scuttlebutt pub and peer it can find, even if you have no relationship with them, as it looks for data from your friends.",
    noConnections: "No peers connected.",
    connectionActionIntro:
      "You can decide when you want your computer to network with peers. You can start, stop, or restart your networking whenever you'd like.",
    startNetworking: "Start networking",
    stopNetworking: "Stop networking",
    restartNetworking: "Restart networking",
    sync: "Connect and Sync",
    indexes: "Indexes",
    indexesDescription:
      "Reddito keeps a cache of common calculations so that we can save time. Unfortunately this is a common source of bugs. Rebuilding your indexes is safe, and may fix some types of bugs.",
    invites: "Invites",
    invitesDescription:
      "Redeem an invite by pasting it below. If it works, you'll follow the feed and they'll follow you back.",
    acceptInvite: "Accept invite",
    // search page
    searchLabel: "Add word(s) to look for in downloaded messages.",
    // image search page
    imageSearchLabel: "Enter words to search for images labelled with them",
    // posts and comments
    commentDescription: ({ parentUrl }) => [
      " commented on ",
      a({ href: parentUrl }, " thread"),
    ],
    commentTitle: ({ authorName }) => [`Comment on @${authorName}'s message`],
    subtopicDescription: ({ parentUrl }) => [
      " created a subtopic from ",
      a({ href: parentUrl }, " a message"),
    ],
    subtopicTitle: ({ authorName }) => [`Subtopic on @${authorName}'s message`],
    mysteryDescription: "posted a mysterious message",
    // misc
    redditoDescription: "Friendly neighborhood scuttlebutt interface",
    submit: "Submit",
    editProfile: "Edit profile",
    editProfileDescription:
      "Edit your profile with Markdown. Old versions of your profile information still exist and can't be deleted, but most SSB apps don't show them.",
    profileName: "Profile name (plain text)",
    profileImage: "Profile image",
    profileDescription: "Profile description (Markdown)",
    hashtagDescription:
      "Posts from people in your network that reference this hashtag, sorted by recency.",
    rebuildName: "Rebuild database indexes",
  },
 
};

module.exports = dscrp;
