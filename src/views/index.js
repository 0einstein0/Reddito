"use strict";

const path = require("path");
const envPaths = require("env-paths");
const fs = require("fs");

const debug = require("debug")("reddito");
const highlightJs = require("highlight.js");

const MarkdownIt = require("markdown-it");
const prettyMs = require("pretty-ms");

const {
  a,
  article,
  br,
  body,
  button,
  details,
  div,
  em,
  footer,
  form,
  h1,
  h2,
  head,
  header,
  hr,
  html,
  img,
  input,
  label,
  li,
  link,
  main,
  meta,
  nav,
  option,
  p,
  pre,
  progress,
  section,
  select,
  span,
  summary,
  textarea,
  title,
  ul,
} = require("hyperaxe");

const lodash = require("lodash");
const markdown = require("./markdown");

const dscrpBase = require("./dscrp");

let selectedLanguage = "en";
let dscrp = dscrpBase[selectedLanguage];

exports.setLanguage = (language) => {
  selectedLanguage = language;
  dscrp = Object.assign({}, dscrpBase.en, dscrpBase[language]);
};

const markdownUrl = "https://commonmark.org/help/";
const doctypeString = "<!DOCTYPE html>";

const THREAD_PREVIEW_LENGTH = 3;

const toAttributes = (obj) =>
  Object.entries(obj)
    .map(([key, val]) => `${key}=${val}`)
    .join(", ");

// non-breaking space
const nbsp = "\xa0";

const template = (titlePrefix, ...elements) => {
  const navLink = ({ href, text }) =>
    li(
      a(
        { href, class: titlePrefix === text ? "current" : "" },
        nbsp,
        text
      )
    );

  const customCSS = (filename) => {
    const customStyleFile = path.join(
      envPaths("reddito", { suffix: "" }).config,
      filename
    );
    try {
      if (fs.existsSync(customStyleFile)) {
        return link({ rel: "stylesheet", href: filename });
      }
    } catch (error) {
      return "";
    }
  };

  const nodes = html(
    { lang: "en" },
    head(
      title(titlePrefix, " - Reddito"),
      link({ rel: "stylesheet", href: "/theme.css" }),
      link({ rel: "stylesheet", href: "/assets/style.css" }),
      link({ rel: "stylesheet", href: "/assets/highlight.css" }),
      customCSS("/custom-style.css"),
      link({ rel: "icon", type: "image/x-icon", href: "/assets/reddito.ico" }),
      meta({ charset: "utf-8" }),
      meta({
        name: "description",
        content: dscrp.redditoDescription,
      }),
      meta({
        name: "viewport",
        content: toAttributes({ width: "device-width", "initial-scale": 1 }),
      })
    ),
    body(
      nav(
        img({ src:('/assets/reddito.png')}),
        ul( 
          
          navLink({ href: "/profile",  text: dscrp.profile }),
          
          navLink({
            href: "/public/latest/extended",
            
            text: dscrp.extended,
          }),
         
         
          navLink({
            href: "/public/latest/summaries",
            
            text: dscrp.summaries,
          }),
          
          navLink({
            href: "/publish",
           
            text: dscrp.publish,
          }),
          
          navLink({ href: "/mentions",  text: dscrp.mentions }),
          navLink({ href: "/inbox",  text: dscrp.private }),
          navLink({ href: "/search", text: dscrp.search }),
          navLink({
            href: "/imageSearch",
  
            text: dscrp.imageSearch,
          }),
          navLink({ href: "/settings", text: dscrp.settings })
        )
      ),
      main({ id: "content" }, elements)
    )
  );

  const result = doctypeString + nodes.outerHTML;

  return result;
};

const thread = (messages) => {
  // this first loop is preprocessing to enable auto-expansion of forks when a
  // message in the fork is linked to

  let lookingForTarget = true;
  let shallowest = Infinity;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const depth = lodash.get(msg, "value.meta.thread.depth", 0);

    if (lookingForTarget) {
      const isThreadTarget = Boolean(
        lodash.get(msg, "value.meta.thread.target", false)
      );

      if (isThreadTarget) {
        lookingForTarget = false;
      }
    } else {
      if (depth < shallowest) {
        lodash.set(msg, "value.meta.thread.ancestorOfTarget", true);
        shallowest = depth;
      }
    }
  }

  const msgList = [];
  for (let i = 0; i < messages.length; i++) {
    const j = i + 1;

    const currentMsg = messages[i];
    const nextMsg = messages[j];

    const depth = (msg) => {
      // will be undefined when checking depth(nextMsg) when currentMsg is the
      // last message in the thread
      if (msg === undefined) return 0;
      return lodash.get(msg, "value.meta.thread.depth", 0);
    };

    msgList.push(post({ msg: currentMsg }).outerHTML);

    if (depth(currentMsg) < depth(nextMsg)) {
      const isAncestor = Boolean(
        lodash.get(currentMsg, "value.meta.thread.ancestorOfTarget", false)
      );
      const isBlocked = Boolean(nextMsg.value.meta.blocking);
      msgList.push(`<div class="indent"><details ${isAncestor ? "open" : ""}>`);

      const nextAuthor = lodash.get(nextMsg, "value.meta.author.name");
      const nextSnippet = postSnippet(
        lodash.has(nextMsg, "value.content.contentWarning")
          ? lodash.get(nextMsg, "value.content.contentWarning")
          : lodash.get(nextMsg, "value.content.text")
      );
      msgList.push(
        summary(
          isBlocked
            ? dscrp.relationshipBlockingPost
            : `${nextAuthor}: ${nextSnippet}`
        ).outerHTML
      );
    } else if (depth(currentMsg) > depth(nextMsg)) {
      // getting more shallow
      const diffDepth = depth(currentMsg) - depth(nextMsg);

      const shallowList = [];
      for (let d = 0; d < diffDepth; d++) {
        // on the way up it might go several depths at once
        shallowList.push("</details></div>");
      }

      msgList.push(shallowList);
    }
  }

  const htmlStrings = lodash.flatten(msgList);
  return div(
    {},
    { class: "thread-container", innerHTML: htmlStrings.join("") }
  );
};

const postSnippet = (text) => {
  const max = 40;

  text = text.trim().split("\n", 3).join("\n");
  // this is taken directly from patchwork. i'm not entirely sure what this
  // regex is doing
  text = text.replace(/_|`|\*|#|^\[@.*?]|\[|]|\(\S*?\)/g, "").trim();
  text = text.replace(/:$/, "");
  text = text.trim().split("\n", 1)[0].trim();

  if (text.length > max) {
    text = text.substring(0, max - 1) + "…";
  }

  return text;
};

/**
 * Render a section containing a link that takes users to the context for a
 * thread preview.
 *
 * @param {Array} thread with SSB message objects
 * @param {Boolean} isComment true if this is shown in the context of a comment
 *  instead of a post
 */
const continueThreadComponent = (thread, isComment) => {
  const encoded = {
    next: encodeURIComponent(thread[THREAD_PREVIEW_LENGTH + 1].key),
    parent: encodeURIComponent(thread[0].key),
  };
  const left = thread.length - (THREAD_PREVIEW_LENGTH + 1);
  let continueLink;
  if (isComment == false) {
    continueLink = `/thread/${encoded.parent}#${encoded.next}`;
    return a(
      { href: continueLink },
      `continue reading ${left} more comment${left === 1 ? "" : "s"}`
    );
  } else {
    continueLink = `/thread/${encoded.parent}`;
    return a({ href: continueLink }, "read the rest of the thread");
  }
};

/**
 * Render an aside with a preview of comments on a message
 *
 * For posts, up to three comments are shown, for comments, up to 3 messages
 * directly following this one in the thread are displayed. If there are more
 * messages in the thread, a link is rendered that links to the rest of the
 * context.
 *
 * @param {Object} post for which to display the aside
 */
const postAside = ({ key, value }) => {
  const thread = value.meta.thread;
  if (thread == null) return null;

  const isComment = value.meta.postType === "comment";

  let postsToShow;
  if (isComment) {
    const commentPosition = thread.findIndex((msg) => msg.key === key);
    postsToShow = thread.slice(
      commentPosition + 1,
      Math.min(commentPosition + (THREAD_PREVIEW_LENGTH + 1), thread.length)
    );
  } else {
    postsToShow = thread.slice(
      1,
      Math.min(thread.length, THREAD_PREVIEW_LENGTH + 1)
    );
  }

  const fragments = postsToShow.map((p) => post({ msg: p }));

  if (thread.length > THREAD_PREVIEW_LENGTH + 1) {
    fragments.push(section(continueThreadComponent(thread, isComment)));
  }

  return div({ class: "indent" }, fragments);
};

const post = ({ msg, aside = false }) => {
  const encoded = {
    key: encodeURIComponent(msg.key),
    author: encodeURIComponent(msg.value.author),
    parent: encodeURIComponent(msg.value.content.root),
  };

  const url = {
    author: `/author/${encoded.author}`,
    likeForm: `/like/${encoded.key}`,
    link: `/thread/${encoded.key}#${encoded.key}`,
    parent: `/thread/${encoded.parent}#${encoded.parent}`,
    avatar: msg.value.meta.author.avatar.url,
    json: `/json/${encoded.key}`,
    subtopic: `/subtopic/${encoded.key}`,
    comment: `/comment/${encoded.key}`,
  };

  const isPrivate = Boolean(msg.value.meta.private);
  const isBlocked = Boolean(msg.value.meta.blocking);
  const isRoot = msg.value.content.root == null;
  const isFork = msg.value.meta.postType === "subtopic";
  const hasContentWarning =
    typeof msg.value.content.contentWarning === "string";
  const isThreadTarget = Boolean(
    lodash.get(msg, "value.meta.thread.target", false)
  );

  const { name } = msg.value.meta.author;

  const ts_received = msg.value.meta.timestamp.received;
  const timeAgo = ts_received.since.replace("~", "");
  const timeAbsolute = ts_received.iso8601.split(".")[0].replace("T", " ");

  const markdownContent = markdown(
    msg.value.content.text,
    msg.value.content.mentions
  );

  const likeButton = msg.value.meta.voted
    ? { value: 0, class: "liked" }
    : { value: 1, class: null };

  const likeCount = msg.value.meta.votes.length;
  const maxLikedNameLength = 16;
  const maxLikedNames = 16;

  const likedByNames = msg.value.meta.votes
    .slice(0, maxLikedNames)
    .map((person) => person.name)
    .map((name) => name.slice(0, maxLikedNameLength))
    .join(", ");

  const additionalLikesMessage =
    likeCount > maxLikedNames ? `+${likeCount - maxLikedNames} more` : ``;

  const likedByMessage =
    likeCount > 0 ? `Liked by ${likedByNames} ${additionalLikesMessage}` : null;

  const messageClasses = ["post"];

  const recps = [];

  const addRecps = (recpsInfo) => {
    recpsInfo.forEach(function (recp) {
      recps.push(
        a(
          { href: `/author/${encodeURIComponent(recp.feedId)}` },
          img({ class: "avatar", src: recp.avatarUrl, alt: "" })
        )
      );
    });
  };

  if (isPrivate) {
    messageClasses.push("private");
    addRecps(msg.value.meta.recpsInfo);
  }

  if (isThreadTarget) {
    messageClasses.push("thread-target");
  }

  // TODO: Refactor to stop using strings and use constants/symbols.
  const postOptions = {
    post: null,
    comment: dscrp.commentDescription({ parentUrl: url.parent }),
    subtopic: dscrp.subtopicDescription({ parentUrl: url.parent }),
    mystery: dscrp.mysteryDescription,
  };

  const emptyContent = "<p>undefined</p>\n";
  const articleElement =
    markdownContent === emptyContent
      ? article(
          { class: "content" },
          pre({
            innerHTML: highlightJs.highlight(
              "json",
              JSON.stringify(msg, null, 2)
            ).value,
          })
        )
      : article({ class: "content", innerHTML: markdownContent });

  if (isBlocked) {
    messageClasses.push("blocked");
    return section(
      {
        id: msg.key,
        class: messageClasses.join(" "),
      },
      dscrp.relationshipBlockingPost
    );
  }

  const articleContent = hasContentWarning
    ? details(summary(msg.value.content.contentWarning), articleElement)
    : articleElement;

  const fragment = section(
    {
      id: msg.key,
      class: messageClasses.join(" "),
    },
    header(
      div(
        span(
          { class: "author" },
          a(
            { href: url.author },
            img({ class: "avatar", src: url.avatar, alt: "" }),
            name
          )
        ),
        span({ class: "author-action" }, postOptions[msg.value.meta.postType]),
        span(
          {
            class: "time",
            title: timeAbsolute,
          },
          isPrivate ? "🔒" : null,
          isPrivate ? recps : null,
          a({ href: url.link }, nbsp, timeAgo)
        )
      )
    ),
    articleContent,

    // HACK: centered-footer
    //
    // Here we create an empty div with an anchor tag that can be linked to.
    // In our CSS we ensure that this gets centered on the screen when we
    // link to this anchor tag.
    //
    // This is used for redirecting users after they like a post, when we
    // want the like button that they just clicked to remain close-ish to
    // where it was before they clicked the button.
    div({ id: `centered-footer-${encoded.key}`, class: "centered-footer" }),

    footer(
      div(
        form(
          { action: url.likeForm, method: "post" },
          button(
            {
              name: "voteValue",
              type: "submit",
              value: likeButton.value,
              class: likeButton.class,
              title: likedByMessage,
            },
            `❤ ${likeCount}`
          )
        ),
        a({ href: url.comment }, dscrp.comment),
        isPrivate || isRoot || isFork
          ? null
          : a({ href: url.subtopic }, nbsp, dscrp.subtopic),
        a({ href: url.json }, nbsp, dscrp.json)
      ),
      br()
    )
  );

  const threadSeparator = [div({ class: "text-browser" }, hr(), br())];

  if (aside) {
    return [fragment, postAside(msg), isRoot ? threadSeparator : null];
  } else {
    return fragment;
  }
};

exports.editProfileView = ({ name, description }) =>
  template(
    dscrp.editProfile,
    section(
      h1(dscrp.editProfile),
      p(dscrp.editProfileDescription),
      form(
        {
          action: "/profile/edit",
          method: "POST",
          enctype: "multipart/form-data",
        },
        label(
          dscrp.profileImage,
          input({ type: "file", name: "image", accept: "image/*" })
        ),
        label(dscrp.profileName, input({ name: "name", value: name })),
        label(
          dscrp.profileDescription,
          textarea(
            {
              autofocus: true,
              name: "description",
            },
            description
          )
        ),
        button(
          {
            type: "submit",
          },
          dscrp.submit
        )
      )
    )
  );

/**
 * @param {{avatarUrl: string, description: string, feedId: string, messages: any[], name: string, relationship: object, firstPost: object, lastPost: object}} input
 */
exports.authorView = ({
  avatarUrl,
  description,
  feedId,
  messages,
  firstPost,
  lastPost,
  name,
  relationship,
}) => {
  const mention = `[@${name}](${feedId})`;
  const markdownMention = highlightJs.highlight("markdown", mention).value;

  const contactForms = [];

  const addForm = ({ action }) =>
    contactForms.push(
      form(
        {
          action: `/${action}/${encodeURIComponent(feedId)}`,
          method: "post",
        },
        button(
          {
            type: "submit",
          },
          dscrp[action]
        )
      )
    );

  if (relationship.me === false) {
    if (relationship.following) {
      addForm({ action: "unfollow" });
    } else if (relationship.blocking) {
      addForm({ action: "unblock" });
    } else {
      addForm({ action: "follow" });
      addForm({ action: "block" });
    }
  }

  const relationshipText = (() => {
    if (relationship.me === true) {
      return dscrp.relationshipYou;
    } else if (
      relationship.following === true &&
      relationship.blocking === false
    ) {
      return dscrp.relationshipFollowing;
    } else if (
      relationship.following === false &&
      relationship.blocking === true
    ) {
      return dscrp.relationshipBlocking;
    } else if (
      relationship.following === false &&
      relationship.blocking === false
    ) {
      return dscrp.relationshipNone;
    } else if (
      relationship.following === true &&
      relationship.blocking === true
    ) {
      return dscrp.relationshipConflict;
    } else {
      throw new Error(`Unknown relationship ${JSON.stringify(relationship)}`);
    }
  })();

  const prefix = section(
    { class: "message" },
    div(
      { class: "profile" },
      img({ class: "avatar", src: avatarUrl }),
      h1(name)
    ),
    pre({
      class: "md-mention",
      innerHTML: markdownMention,
    }),
    description !== "" ? article({ innerHTML: markdown(description) }) : null,
    footer(
      div(
        a({ href: `/likes/${encodeURIComponent(feedId)}` }, dscrp.viewLikes),
        span(nbsp, relationshipText),
        ...contactForms,
        relationship.me
          ? a({ href: `/profile/edit` }, nbsp, dscrp.editProfile)
          : null
      ),
      br()
    )
  );

  const linkUrl = relationship.me
    ? "/profile/"
    : `/author/${encodeURIComponent(feedId)}/`;

  let items = messages.map((msg) => post({ msg }));
  if (items.length === 0) {
    if (lastPost === undefined) {
      items.push(section(div(span(dscrp.feedEmpty))));
    } else {
      items.push(
        section(
          div(
            span(dscrp.feedRangeEmpty),
            a({ href: `${linkUrl}` }, dscrp.seeFullFeed)
          )
        )
      );
    }
  } else {
    const highestSeqNum = messages[0].value.sequence;
    const lowestSeqNum = messages[messages.length - 1].value.sequence;
    let newerPostsLink;
    if (lastPost !== undefined && highestSeqNum < lastPost.value.sequence)
      newerPostsLink = a(
        { href: `${linkUrl}?gt=${highestSeqNum}` },
        dscrp.newerPosts
      );
    else newerPostsLink = span(dscrp.newerPosts, { title: dscrp.noNewerPosts });
    let olderPostsLink;
    if (lowestSeqNum > firstPost.value.sequence)
      olderPostsLink = a(
        { href: `${linkUrl}?lt=${lowestSeqNum}` },
        dscrp.olderPosts
      );
    else
      olderPostsLink = span(dscrp.olderPosts, { title: dscrp.beginningOfFeed });
    const pagination = section(
      { class: "message" },
      footer(div(newerPostsLink, olderPostsLink), br())
    );
    items.unshift(pagination);
    items.push(pagination);
  }

  return template(dscrp.profile, prefix, items);
};

exports.previewCommentView = async ({
  previewData,
  messages,
  myFeedId,
  parentMessage,
  contentWarning,
}) => {
  const publishAction = `/comment/${encodeURIComponent(messages[0].key)}`;

  const preview = generatePreview({
    previewData,
    contentWarning,
    action: publishAction,
  });
  return exports.commentView(
    { messages, myFeedId, parentMessage },
    preview,
    previewData.text,
    contentWarning
  );
};

exports.commentView = async (
  { messages, myFeedId, parentMessage },
  preview,
  text,
  contentWarning
) => {
  let markdownMention;

  const messageElements = await Promise.all(
    messages.reverse().map((message) => {
      debug("%O", message);
      const authorName = message.value.meta.author.name;
      const authorFeedId = message.value.author;
      if (authorFeedId !== myFeedId) {
        if (message.key === parentMessage.key) {
          const x = `[@${authorName}](${authorFeedId})\n\n`;
          markdownMention = x;
        }
      }
      return post({ msg: message });
    })
  );

  const action = `/comment/preview/${encodeURIComponent(messages[0].key)}`;
  const method = "post";

  const isPrivate = parentMessage.value.meta.private;
  const authorName = parentMessage.value.meta.author.name;

  const publicOrPrivate = isPrivate ? dscrp.commentPrivate : dscrp.commentPublic;
  const maybeSubtopicText = isPrivate ? [null] : dscrp.commentWarning;

  return template(
    dscrp.commentTitle({ authorName }),
    div({ class: "thread-container" }, messageElements),
    preview !== undefined ? preview : "",
    p(
      ...dscrp.commentLabel({ publicOrPrivate, markdownUrl }),
      ...maybeSubtopicText
    ),
    form(
      { action, method, enctype: "multipart/form-data" },
      textarea(
        {
          autofocus: true,
          required: true,
          name: "text",
        },
        text ? text : isPrivate ? null : markdownMention
      ),
      label(
        dscrp.contentWarningLabel,
        input({
          name: "contentWarning",
          type: "text",
          class: "contentWarning",
          value: contentWarning ? contentWarning : "",
          placeholder: dscrp.contentWarningPlaceholder,
        })
      ),
      button({ type: "submit" }, dscrp.preview),
      label({ class: "file-button", for: "blob" }, dscrp.attachFiles),
      input({ type: "file", id: "blob", name: "blob" })
    )
  );
};

exports.mentionsView = ({ messages }) => {
  return messageListView({
    messages,
    viewTitle: dscrp.mentions,
    viewDescription: dscrp.mentionsDescription,
  });
};

exports.privateView = ({ messages }) => {
  return messageListView({
    messages,
    viewTitle: dscrp.private,
    viewDescription: dscrp.privateDescription,
  });
};

exports.publishCustomView = async () => {
  const action = "/publish/custom";
  const method = "post";

  return template(
    dscrp.publishCustom,
    section(
      h1(dscrp.publishCustom),
      p(dscrp.publishCustomDescription),
      form(
        { action, method },
        textarea(
          {
            autofocus: true,
            required: true,
            name: "text",
          },
          "{\n",
          '  "type": "test",\n',
          '  "hello": "world"\n',
          "}"
        ),
        button(
          {
            type: "submit",
          },
          dscrp.submit
        )
      )
    ),
    p(dscrp.publishBasicInfo({ href: "/publish" }))
  );
};

exports.threadView = ({ messages }) => {
  const rootMessage = messages[0];
  const rootAuthorName = rootMessage.value.meta.author.name;
  const rootSnippet = postSnippet(
    lodash.get(rootMessage, "value.content.text", dscrp.mysteryDescription)
  );
  return template([`@${rootAuthorName}: `, rootSnippet], thread(messages));
};

// this view is only used for the /settings/readme page.
// To fix style glitches it uses the default MarkdownIt and not ssb-markdown.
const md = new MarkdownIt();
exports.markdownView = ({ text }) => {
  const rawHtml = md.render(text);

  return template(
    postSnippet(text),
    section({ class: "message" }, { innerHTML: rawHtml })
  );
};

exports.publishView = (preview, text, contentWarning) => {
  return template(
    dscrp.publish,
    section(
      h1(dscrp.publish),
      form(
        {
          action: "/publish/preview",
          method: "post",
          enctype: "multipart/form-data",
        },
        label(
          dscrp.publishLabel({ markdownUrl, linkTarget: "_blank" }),
          textarea({ required: true, name: "text" }, text ? text : "")
        ),
        label(
          dscrp.contentWarningLabel,
          input({
            name: "contentWarning",
            type: "text",
            class: "contentWarning",
            value: contentWarning ? contentWarning : "",
            placeholder: dscrp.contentWarningPlaceholder,
          })
        ),
        button({ type: "submit" }, dscrp.preview),
        label({ class: "file-button", for: "blob" }, dscrp.attachFiles),
        input({ type: "file", id: "blob", name: "blob" })
      )
    ),
    preview ? preview : "",
  
  );
};

const generatePreview = ({ previewData, contentWarning, action }) => {
  const { authorMeta, text, mentions } = previewData;

  // craft message that looks like it came from the db
  // cb: this kinda fragile imo? this is for getting a proper post styling ya?
  const msg = {
    key: "%non-existent.preview",
    value: {
      author: authorMeta.id,
      // sequence: -1,
      content: {
        type: "post",
        text: text,
      },
      timestamp: Date.now(),
      meta: {
        isPrivate: true,
        votes: [],
        author: {
          name: authorMeta.name,
          avatar: {
            url: `/image/64/${encodeURIComponent(authorMeta.image)}`,
          },
        },
      },
    },
  };
  if (contentWarning) msg.value.content.contentWarning = contentWarning;
  const ts = new Date(msg.value.timestamp);
  lodash.set(msg, "value.meta.timestamp.received.iso8601", ts.toISOString());
  const ago = Date.now() - Number(ts);
  const prettyAgo = prettyMs(ago, { compact: true });
  lodash.set(msg, "value.meta.timestamp.received.since", prettyAgo);
  return div(
    Object.keys(mentions).length === 0
      ? ""
      : section(
          { class: "mention-suggestions" },
          h2(dscrp.mentionsMatching),
          Object.keys(mentions).map((name) => {
            let matches = mentions[name];

            return div(
              matches.map((m) => {
                let relationship = { emoji: "", desc: "" };
                if (m.rel.followsMe && m.rel.following) {
                  // mutuals get the handshake emoji
                  relationship.emoji = "🤝";
                  relationship.desc = dscrp.relationshipMutuals;
                } else if (m.rel.following) {
                  // if we're following that's an eyes emoji
                  relationship.emoji = "👀";
                  relationship.desc = dscrp.relationshipFollowing;
                } else if (m.rel.followsMe) {
                  // follower has waving-hand emoji
                  relationship.emoji = "👋";
                  relationship.desc = dscrp.relationshipTheyFollow;
                } else {
                  // no relationship has question mark emoji
                  relationship.emoji = "❓";
                  relationship.desc = dscrp.relationshipNotFollowing;
                }
                return div(
                  { class: "mentions-container" },
                  a(
                    {
                      class: "mentions-image",
                      href: `/author/${encodeURIComponent(m.feed)}`,
                    },
                    img({ src: `/image/64/${encodeURIComponent(m.img)}` })
                  ),
                  a(
                    {
                      class: "mentions-name",
                      href: `/author/${encodeURIComponent(m.feed)}`,
                    },
                    m.name
                  ),
                  div(
                    { class: "emo-rel" },
                    span(
                      { class: "emoji", title: relationship.desc },
                      relationship.emoji
                    ),
                    span(
                      { class: "mentions-listing" },
                      `[@${m.name}](${m.feed})`
                    )
                  )
                );
              })
            );
          })
        ),
    section(
      { class: "post-preview" },
      post({ msg }),

      // doesn't need blobs, preview adds them to the text
      form(
        { action, method: "post" },
        input({
          name: "contentWarning",
          type: "hidden",
          value: contentWarning,
        }),
        input({
          name: "text",
          type: "hidden",
          value: text,
        }),
        button({ type: "submit" }, dscrp.publish)
      )
    )
  );
};

exports.previewView = ({ previewData, contentWarning }) => {
  const publishAction = "/publish";

  const preview = generatePreview({
    previewData,
    contentWarning,
    action: publishAction,
  });
  return exports.publishView(preview, previewData.text, contentWarning);
};

/**
 * @param {{status: object, peers: any[], theme: string, themeNames: string[], version: string }} input
 */
exports.settingsView = ({ peers, theme, themeNames, version }) => {
  const startButton = form(
    { action: "/settings/conn/start", method: "post" },
    button({ type: "submit" }, dscrp.startNetworking)
  );

  const restartButton = form(
    { action: "/settings/conn/restart", method: "post" },
    button({ type: "submit" }, dscrp.restartNetworking)
  );

  const stopButton = form(
    { action: "/settings/conn/stop", method: "post" },
    button({ type: "submit" }, dscrp.stopNetworking)
  );

  const syncButton = form(
    { action: "/settings/conn/sync", method: "post" },
    button({ type: "submit" }, dscrp.sync)
  );

  const connButtons = div({ class: "form-button-group" }, [
    startButton,
    restartButton,
    stopButton,
    syncButton,
  ]);

  const peerList = (peers || [])
    .filter(([, data]) => data.state === "connected")
    .map(([, data]) => {
      return li(
        a(
          { href: `/author/${encodeURIComponent(data.key)}` },
          data.name || data.host || data.key
        )
      );
    });

  const themeElements = themeNames.map((cur) => {
    const isCurrentTheme = cur === theme;
    if (isCurrentTheme) {
      return option({ value: cur, selected: true }, cur);
    } else {
      return option({ value: cur }, cur);
    }
  });



  const languageOption = (longName, shortName) =>
    shortName === selectedLanguage
      ? option({ value: shortName, selected: true }, longName)
      : option({ value: shortName }, longName);

  const rebuildButton = form(
    { action: "/settings/rebuild", method: "post" },
    button({ type: "submit" }, dscrp.rebuildName)
  );

  return template(
    dscrp.settings,
    section(
      { class: "message" },
      h1(dscrp.settings),
      
      h2(dscrp.peerConnections),
      p(dscrp.connectionsIntro),
      peerList.length > 0 ? ul(peerList) : dscrp.noConnections,
      
      h2(dscrp.invites),
      p(dscrp.invitesDescription),
      form(
        { action: "/settings/invite/accept", method: "post" },
        input({ name: "invite", type: "text" }),
        button({ type: "submit" }, dscrp.acceptInvite)
      ),
     
      h2(dscrp.indexes),
      p(dscrp.indexesDescription),
      rebuildButton
    )
  );
};

/** @param {{ viewTitle: string, viewDescription: string }} input */
const viewInfoBox = ({ viewTitle = null, viewDescription = null }) => {
  if (!viewTitle && !viewDescription) {
    return null;
  }
  return section(
    { class: "viewInfo" },
    viewTitle ? h1(viewTitle) : null,
    viewDescription ? em(viewDescription) : null
  );
};

exports.likesView = async ({ messages, feed, name }) => {
  const authorLink = a(
    { href: `/author/${encodeURIComponent(feed)}` },
    "@" + name
  );

  return template(
    ["@", name, dscrp.likedBy],
    viewInfoBox({
      viewTitle: span(authorLink, dscrp.likedBy),
      // TODO: dscrp
      viewDescription: "List of messages liked by this author.",
    }),
    messages.map((msg) => post({ msg }))
  );
};

const messageListView = ({
  messages,
  viewTitle = null,
  viewDescription = null,
  viewElements = null,
  // If `aside = true`, it will show a few comments in the thread.
  aside = null,
}) => {
  return template(
    viewTitle,
    section(h1(viewTitle), p(viewDescription), viewElements),
    messages.map((msg) => post({ msg, aside }))
  );
};



exports.extendedView = ({ messages }) => {
  return messageListView({
    messages,
    viewTitle: dscrp.extended,
    viewDescription: dscrp.extendedDescription,
  });
};

exports.latestView = ({ messages }) => {
  return messageListView({
    messages,
    viewTitle: dscrp.latest,
    viewDescription: dscrp.latestDescription,
  });
};



exports.summaryView = ({ messages }) => {
  return messageListView({
    messages,
    viewTitle: dscrp.summaries,
    viewDescription: dscrp.summariesDescription,
    aside: true,
  });
};

exports.threadsView = ({ messages }) => {
  return messageListView({
    messages,
    viewTitle: dscrp.threads,
    viewDescription: dscrp.threadsDescription,
    aside: true,
  });
};

exports.previewSubtopicView = async ({
  previewData,
  messages,
  myFeedId,
  contentWarning,
}) => {
  const publishAction = `/subtopic/${encodeURIComponent(messages[0].key)}`;

  const preview = generatePreview({
    previewData,
    contentWarning,
    action: publishAction,
  });
  return exports.subtopicView(
    { messages, myFeedId },
    preview,
    previewData.text,
    contentWarning
  );
};

exports.subtopicView = async (
  { messages, myFeedId },
  preview,
  text,
  contentWarning
) => {
  const subtopicForm = `/subtopic/preview/${encodeURIComponent(
    messages[messages.length - 1].key
  )}`;

  let markdownMention;

  const messageElements = await Promise.all(
    messages.reverse().map((message) => {
      debug("%O", message);
      const authorName = message.value.meta.author.name;
      const authorFeedId = message.value.author;
      if (authorFeedId !== myFeedId) {
        if (message.key === messages[0].key) {
          const x = `[@${authorName}](${authorFeedId})\n\n`;
          markdownMention = x;
        }
      }
      return post({ msg: message });
    })
  );

  const authorName = messages[messages.length - 1].value.meta.author.name;

  return template(
    dscrp.subtopicTitle({ authorName }),
    div({ class: "thread-container" }, messageElements),
    preview !== undefined ? preview : "",
    p(dscrp.subtopicLabel({ markdownUrl })),
    form(
      { action: subtopicForm, method: "post", enctype: "multipart/form-data" },
      textarea(
        {
          autofocus: true,
          required: true,
          name: "text",
        },
        text ? text : markdownMention
      ),
      label(
        dscrp.contentWarningLabel,
        input({
          name: "contentWarning",
          type: "text",
          class: "contentWarning",
          value: contentWarning ? contentWarning : "",
          placeholder: dscrp.contentWarningPlaceholder,
        })
      ),
      button({ type: "submit" }, dscrp.preview),
      label({ class: "file-button", for: "blob" }, dscrp.attachFiles),
      input({ type: "file", id: "blob", name: "blob" })
    )
  );
};

exports.searchView = ({ messages, query }) => {
  const searchInput = input({
    name: "query",
    required: false,
    type: "search",
    value: query,
  });

  // - Minimum length of 3 because otherwise SSB-Search hangs forever. :)
  //   https://github.com/ssbc/ssb-search/issues/8
  // - Using `setAttribute()` because HyperScript (the HyperAxe dependency has
  //   a bug where the `minlength` property is being ignored. No idea why.
  //   https://github.com/hyperhype/hyperscript/issues/91
  searchInput.setAttribute("minlength", 3);

  return template(
    dscrp.search,
    section(
      h1(dscrp.search),
      form(
        { action: "/search", method: "get" },
        label(dscrp.searchLabel, searchInput),
        button(
          {
            type: "submit",
          },
          dscrp.submit
        )
      )
    ),
    messages.map((msg) => post({ msg }))
  );
};

const imageResult = ({ id, infos }) => {
  const encodedBlobId = encodeURIComponent(id);
  // only rendering the first message result so far
  // todo: render links to the others as well
  const info = infos[0];
  const encodedMsgId = encodeURIComponent(info.msg);

  return div(
    {
      class: "image-result",
    },
    [
      a(
        {
          href: `/blob/${encodedBlobId}`,
        },
        img({ src: `/image/256/${encodedBlobId}` })
      ),
      a(
        {
          href: `/thread/${encodedMsgId}#${encodedMsgId}`,
          class: "result-text",
        },
        info.name
      ),
    ]
  );
};

exports.imageSearchView = ({ blobs, query }) => {
  const searchInput = input({
    name: "query",
    required: false,
    type: "search",
    value: query,
  });

  // - Minimum length of 3 because otherwise SSB-Search hangs forever. :)
  //   https://github.com/ssbc/ssb-search/issues/8
  // - Using `setAttribute()` because HyperScript (the HyperAxe dependency has
  //   a bug where the `minlength` property is being ignored. No idea why.
  //   https://github.com/hyperhype/hyperscript/issues/91
  searchInput.setAttribute("minlength", 3);

  return template(
    dscrp.imageSearch,
    section(
      h1(dscrp.imageSearch),
      form(
        { action: "/imageSearch", method: "get" },
        label(dscrp.imageSearchLabel, searchInput),
        button(
          {
            type: "submit",
          },
          dscrp.submit
        )
      )
    ),
    div(
      {
        class: "image-search-grid",
      },
      Object.keys(blobs)
        // todo: add pagination
        .slice(0, 30)
        .map((blobId) => imageResult({ id: blobId, infos: blobs[blobId] }))
    )
  );
};

exports.hashtagView = ({ messages, hashtag }) => {
  return template(
    `#${hashtag}`,
    section(h1(`#${hashtag}`), p(dscrp.hashtagDescription)),
    messages.map((msg) => post({ msg }))
  );
};

/** @param {{percent: number}} input */
exports.indexingView = ({ percent }) => {
  // TODO: dscrp
  const message = `Reddito has only processed ${percent}% of the messages and needs to catch up. This page will refresh every 10 seconds. Thanks for your patience! ❤`;

  const nodes = html(
    { lang: "en" },
    head(
      title("Reddito"),
      link({ rel: "icon", type: "image/x-icon", href: "/assets/reddito.ico" }),
      meta({ charset: "utf-8" }),
      meta({
        name: "description",
        content: dscrp.redditoDescription,
      }),
      meta({
        name: "viewport",
        content: toAttributes({ width: "device-width", "initial-scale": 1 }),
      }),
      meta({ "http-equiv": "refresh", content: 10 })
    ),
    body(
      main(
        { id: "content" },
        p(message),
        progress({ value: percent, max: 100 })
      )
    )
  );

  const result = doctypeString + nodes.outerHTML;

  return result;
};
