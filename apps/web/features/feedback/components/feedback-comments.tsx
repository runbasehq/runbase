"use client";

import {
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDown01Icon,
  Attachment01Icon,
  Image01Icon,
  Link01Icon,
  Tick02Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  EditorContent,
  mergeAttributes,
  Node as TiptapNode,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import { useMutation } from "@tanstack/react-query";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FancyButton } from "@/components/ui/fancy-button";
import { cn } from "@/lib/utils";
import { FEEDBACK_MEDIA_MAX_BYTES } from "~/feedback/lib/constants";
import {
  extractTextFromFeedbackContent,
  hasEmbeddedFeedbackMedia,
  normalizeFeedbackContentToHtml,
} from "~/feedback/lib/rich-content";
import type {
  FeedbackMediaType,
  FeedbackUploadedMedia,
} from "~/feedback/lib/types";

import { useCreateFeedbackComment } from "../hooks/use-create-feedback-comment";
import { useFeedbackComments } from "../hooks/use-feedback-comments";

interface FeedbackCommentsProps {
  workspaceSlug: string;
  postId: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  enabled?: boolean;
}

interface UploadMediaResponse {
  media: FeedbackUploadedMedia;
}

const MEDIA_WIDTH_MIN_PERCENT = 40;
const MEDIA_WIDTH_MAX_PERCENT = 100;

type MediaAlign = "left" | "center" | "right";
type TextBlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList";

function clampMediaWidthPercent(value: number) {
  if (!Number.isFinite(value)) {
    return MEDIA_WIDTH_MAX_PERCENT;
  }

  return Math.min(
    MEDIA_WIDTH_MAX_PERCENT,
    Math.max(MEDIA_WIDTH_MIN_PERCENT, Math.round(value)),
  );
}

function normalizeMediaAlign(value: unknown): MediaAlign {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }

  return "center";
}

function getMediaInlineMargins(align: MediaAlign) {
  return align === "left"
    ? { left: "0", right: "auto" }
    : align === "right"
      ? { left: "auto", right: "0" }
      : { left: "auto", right: "auto" };
}

function getImageInlineStyle(widthPercent: number, align: MediaAlign) {
  const clampedWidth = clampMediaWidthPercent(widthPercent);
  const margins = getMediaInlineMargins(align);

  return [
    "display:block",
    `width:${clampedWidth}%`,
    "max-width:100%",
    "height:auto",
    "aspect-ratio:auto",
    "object-fit:contain",
    `margin-left:${margins.left}`,
    `margin-right:${margins.right}`,
  ].join(";");
}

function getVideoInlineStyle(widthPercent: number, align: MediaAlign) {
  const clampedWidth = clampMediaWidthPercent(widthPercent);
  const margins = getMediaInlineMargins(align);

  return [
    "display:block",
    `width:${clampedWidth}%`,
    "max-width:100%",
    `margin-left:${margins.left}`,
    `margin-right:${margins.right}`,
  ].join(";");
}

const FeedbackCommentImage = TiptapNode.create({
  name: "feedbackCommentImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: MEDIA_WIDTH_MAX_PERCENT,
        parseHTML: (element) =>
          clampMediaWidthPercent(Number(element.getAttribute("data-width"))),
        renderHTML: (attributes) => ({
          "data-width": String(
            clampMediaWidthPercent(Number(attributes.width)),
          ),
        }),
      },
      align: {
        default: "center",
        parseHTML: (element) =>
          normalizeMediaAlign(element.getAttribute("data-align")),
        renderHTML: (attributes) => ({
          "data-align": normalizeMediaAlign(attributes.align),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "img" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const width = clampMediaWidthPercent(Number(node.attrs.width));
    const align = normalizeMediaAlign(node.attrs.align);
    const restAttributes = { ...HTMLAttributes };
    delete restAttributes.width;
    delete restAttributes.align;

    return [
      "img",
      mergeAttributes(
        {
          style: getImageInlineStyle(width, align),
        },
        restAttributes,
      ),
    ];
  },
});

const FeedbackCommentVideo = TiptapNode.create({
  name: "feedbackCommentVideo",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      preload: { default: "metadata" },
      poster: { default: null },
      width: {
        default: MEDIA_WIDTH_MAX_PERCENT,
        parseHTML: (element) =>
          clampMediaWidthPercent(Number(element.getAttribute("data-width"))),
        renderHTML: (attributes) => ({
          "data-width": String(
            clampMediaWidthPercent(Number(attributes.width)),
          ),
        }),
      },
      align: {
        default: "center",
        parseHTML: (element) =>
          normalizeMediaAlign(element.getAttribute("data-align")),
        renderHTML: (attributes) => ({
          "data-align": normalizeMediaAlign(attributes.align),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const width = clampMediaWidthPercent(Number(node.attrs.width));
    const align = normalizeMediaAlign(node.attrs.align);
    const restAttributes = { ...HTMLAttributes };
    delete restAttributes.width;
    delete restAttributes.align;

    return [
      "video",
      mergeAttributes(
        {
          controls: "",
          preload: "metadata",
          style: getVideoInlineStyle(width, align),
        },
        restAttributes,
      ),
    ];
  },
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface ToolbarButtonProps {
  label: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({
  label,
  disabled = false,
  active = false,
  className,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-7 rounded-lg text-slate-400 hover:bg-transparent hover:text-slate-700",
        active && "bg-slate-100 text-slate-700",
        className,
      )}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export function FeedbackComments({
  workspaceSlug,
  postId,
  isAuthenticated,
  onRequireAuth,
  enabled = true,
}: FeedbackCommentsProps) {
  const [editorHtml, setEditorHtml] = useState("<p></p>");
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const commentsQuery = useFeedbackComments(workspaceSlug, postId, enabled);
  const createComment = useCreateFeedbackComment(
    workspaceSlug,
    postId,
    onRequireAuth,
  );
  const uploadMedia = useMutation<
    FeedbackUploadedMedia,
    Error,
    { file: File; mediaType: FeedbackMediaType }
  >({
    mutationKey: ["feedback", workspaceSlug, "media", "upload"],
    mutationFn: async ({ file, mediaType }) => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mediaType", mediaType);

      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/feedback/media`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          onRequireAuth();
          throw new Error("Please sign in to upload media");
        }

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not upload media");
      }

      const payload = (await response.json()) as UploadMediaResponse;
      return payload.media;
    },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
      }),
      FeedbackCommentImage,
      FeedbackCommentVideo,
    ],
    editorProps: {
      attributes: {
        class: "min-h-[88px] text-sm leading-6 text-slate-900 outline-none",
      },
    },
    content: "<p></p>",
    onUpdate: ({ editor: currentEditor }) => {
      setEditorHtml(currentEditor.getHTML());
      setError(null);
    },
    onFocus: () => setIsEditorFocused(true),
    onBlur: () => setIsEditorFocused(false),
  });

  const selectedMedia = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const activeNodeType = currentEditor?.isActive("feedbackCommentVideo")
        ? "feedbackCommentVideo"
        : currentEditor?.isActive("feedbackCommentImage")
          ? "feedbackCommentImage"
          : null;
      const attributes = (
        activeNodeType ? currentEditor?.getAttributes(activeNodeType) : {}
      ) as {
        width?: unknown;
        align?: unknown;
      };

      return {
        isActive: Boolean(activeNodeType),
        activeNodeType,
        width: clampMediaWidthPercent(Number(attributes.width)),
        align: normalizeMediaAlign(attributes.align),
      };
    },
  });

  const selectedMediaState = selectedMedia ?? {
    isActive: false,
    activeNodeType: null,
    width: MEDIA_WIDTH_MAX_PERCENT,
    align: "center" as MediaAlign,
  };

  const selectedText = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const isMediaActive =
        currentEditor?.isActive("feedbackCommentVideo") ||
        currentEditor?.isActive("feedbackCommentImage");

      const activeBlock: TextBlockType = currentEditor?.isActive("heading", {
        level: 1,
      })
        ? "heading1"
        : currentEditor?.isActive("heading", { level: 2 })
          ? "heading2"
          : currentEditor?.isActive("heading", { level: 3 })
            ? "heading3"
            : currentEditor?.isActive("bulletList")
              ? "bulletList"
              : currentEditor?.isActive("orderedList")
                ? "orderedList"
                : "paragraph";

      return {
        hasSelection: !currentEditor?.state.selection.empty,
        isMediaActive: Boolean(isMediaActive),
        activeBlock,
        bold: Boolean(currentEditor?.isActive("bold")),
        italic: Boolean(currentEditor?.isActive("italic")),
        underline: Boolean(currentEditor?.isActive("underline")),
        strike: Boolean(currentEditor?.isActive("strike")),
        code: Boolean(currentEditor?.isActive("code")),
        codeBlock: Boolean(currentEditor?.isActive("codeBlock")),
        link: Boolean(currentEditor?.isActive("link")),
      };
    },
  });

  const selectedTextState = selectedText ?? {
    hasSelection: false,
    isMediaActive: false,
    activeBlock: "paragraph" as TextBlockType,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    codeBlock: false,
    link: false,
  };

  const editorMeta = useMemo(() => {
    const html = normalizeFeedbackContentToHtml(editorHtml);
    const text = extractTextFromFeedbackContent(html);
    const hasMedia = hasEmbeddedFeedbackMedia(html);

    return {
      html,
      text,
      hasMedia,
      isEmpty: !text.length && !hasMedia,
    };
  }, [editorHtml]);

  const isUploading = uploadMedia.isPending;
  const isBusy = createComment.isPending || isUploading;

  async function insertMedia(file: File, mediaType: FeedbackMediaType) {
    if (!editor) {
      return;
    }

    if (file.size > FEEDBACK_MEDIA_MAX_BYTES) {
      setError("Media must be 10 MB or less");
      return;
    }

    setError(null);

    const uploaded = await uploadMedia
      .mutateAsync({ file, mediaType })
      .catch((uploadError) => {
        setError(uploadError.message || "Could not upload media");
        return null;
      });

    if (!uploaded) {
      return;
    }

    const uploadedMediaType =
      uploaded.mediaType === "image" || uploaded.mediaType === "video"
        ? uploaded.mediaType
        : mediaType;
    const isImageContent =
      /^image\//i.test(uploaded.contentType) || uploadedMediaType === "image";
    const isVideoContent =
      /^video\//i.test(uploaded.contentType) || uploadedMediaType === "video";

    if (isImageContent) {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "feedbackCommentImage",
            attrs: {
              src: uploaded.url,
              alt: uploaded.fileName,
              width: MEDIA_WIDTH_MAX_PERCENT,
              align: "center",
            },
          },
          {
            type: "paragraph",
          },
        ])
        .run();
      return;
    }

    if (isVideoContent) {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "feedbackCommentVideo",
            attrs: {
              src: uploaded.url,
              controls: true,
              preload: "metadata",
              width: MEDIA_WIDTH_MAX_PERCENT,
              align: "center",
            },
          },
          {
            type: "paragraph",
          },
        ])
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(
        `<p><a href="${escapeHtml(uploaded.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(uploaded.fileName)}</a></p>`,
      )
      .run();
  }

  function updateSelectedMediaAlign(align: MediaAlign) {
    if (!editor || !selectedMediaState.isActive) {
      return;
    }

    if (selectedMediaState.activeNodeType === "feedbackCommentVideo") {
      editor
        .chain()
        .focus()
        .updateAttributes("feedbackCommentVideo", { align })
        .run();
      return;
    }

    if (selectedMediaState.activeNodeType === "feedbackCommentImage") {
      editor
        .chain()
        .focus()
        .updateAttributes("feedbackCommentImage", { align })
        .run();
    }
  }

  function handleSelectedMediaWidthChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!editor || !selectedMediaState.isActive) {
      return;
    }

    const width = clampMediaWidthPercent(Number(event.target.value));

    if (selectedMediaState.activeNodeType === "feedbackCommentVideo") {
      editor
        .chain()
        .focus()
        .updateAttributes("feedbackCommentVideo", { width })
        .run();
      return;
    }

    if (selectedMediaState.activeNodeType === "feedbackCommentImage") {
      editor
        .chain()
        .focus()
        .updateAttributes("feedbackCommentImage", { width })
        .run();
    }
  }

  function applyTextBlock(blockType: TextBlockType) {
    if (!editor) {
      return;
    }

    switch (blockType) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        return;
      case "heading1":
        editor.chain().focus().setHeading({ level: 1 }).run();
        return;
      case "heading2":
        editor.chain().focus().setHeading({ level: 2 }).run();
        return;
      case "heading3":
        editor.chain().focus().setHeading({ level: 3 }).run();
        return;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        return;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        return;
      default:
        return;
    }
  }

  async function handleFileInput(
    event: ChangeEvent<HTMLInputElement>,
    mediaType: FeedbackMediaType,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await insertMedia(file, mediaType);
  }

  function handleLink() {
    if (!editor) {
      return;
    }

    const existingUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste URL", existingUrl ?? "https://");

    if (url === null) {
      return;
    }

    const normalizedUrl = url.trim();
    if (!normalizedUrl.length) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: normalizedUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      })
      .run();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (editorMeta.isEmpty) {
      setError("Comment is required");
      return;
    }

    await createComment
      .mutateAsync({ body: editorMeta.html })
      .then(() => {
        editor?.commands.setContent("<p></p>");
        setEditorHtml("<p></p>");
        setError(null);
      })
      .catch((mutationError) => {
        setError(mutationError.message || "Could not create comment");
      });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {enabled && commentsQuery.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded bg-slate-200" />
          </div>
        ) : null}

        {commentsQuery.data?.map((comment) => (
          <article
            key={comment.id}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div
              className="[&_a]:text-indigo-700 [&_a]:underline [&_h1]:my-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-tight [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-tight [&_img]:my-2 [&_img]:max-h-56 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-200 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_video]:my-2 [&_video]:max-h-64 [&_video]:max-w-full [&_video]:rounded-lg [&_video]:border [&_video]:border-slate-200"
              dangerouslySetInnerHTML={{
                __html: normalizeFeedbackContentToHtml(comment.body),
              }}
            />
            <p className="mt-1 text-xs text-slate-600">
              {comment.authorName || "Runbase user"}
            </p>
          </article>
        ))}

        {enabled && !commentsQuery.isLoading && !commentsQuery.data?.length ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            No comments yet.
          </p>
        ) : null}
      </div>

      <form
        className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
        onSubmit={handleSubmit}
      >
        <div className="relative min-h-[88px] rounded-lg border border-slate-300 bg-white px-3 py-2">
          {editorMeta.isEmpty && !isEditorFocused ? (
            <p className="pointer-events-none absolute top-2.5 left-3 text-sm text-slate-500">
              Add a comment
            </p>
          ) : null}
          {editor ? (
            <BubbleMenu
              pluginKey="feedback-comment-text-menu"
              editor={editor}
              updateDelay={80}
              shouldShow={({ editor: currentEditor, state }) => {
                if (
                  isBusy ||
                  !currentEditor.isEditable ||
                  currentEditor.isActive("feedbackCommentVideo") ||
                  currentEditor.isActive("feedbackCommentImage")
                ) {
                  return false;
                }

                return !state.selection.empty;
              }}
              className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 shadow-xl"
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  aria-label="Text block"
                  title="Text block"
                >
                  <span className="text-[13px] font-semibold leading-none">
                    ¶
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                    className="size-2.5"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  <DropdownMenuItem
                    className="h-9 cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyTextBlock("paragraph")}
                  >
                    <span className="w-6 text-left text-xs font-semibold text-slate-400">
                      ¶
                    </span>
                    <span>Paragraph</span>
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "ml-auto size-3.5 text-slate-600",
                        selectedTextState.activeBlock === "paragraph"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-9 cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyTextBlock("heading1")}
                  >
                    <span className="w-6 text-left text-xs font-semibold text-slate-400">
                      H1
                    </span>
                    <span>Heading 1</span>
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "ml-auto size-3.5 text-slate-600",
                        selectedTextState.activeBlock === "heading1"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-9 cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyTextBlock("heading2")}
                  >
                    <span className="w-6 text-left text-xs font-semibold text-slate-400">
                      H2
                    </span>
                    <span>Heading 2</span>
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "ml-auto size-3.5 text-slate-600",
                        selectedTextState.activeBlock === "heading2"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-9 cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyTextBlock("heading3")}
                  >
                    <span className="w-6 text-left text-xs font-semibold text-slate-400">
                      H3
                    </span>
                    <span>Heading 3</span>
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "ml-auto size-3.5 text-slate-600",
                        selectedTextState.activeBlock === "heading3"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-9 cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyTextBlock("bulletList")}
                  >
                    <span className="w-6 text-left text-xs font-semibold text-slate-400">
                      ••
                    </span>
                    <span>Bullet list</span>
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "ml-auto size-3.5 text-slate-600",
                        selectedTextState.activeBlock === "bulletList"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-9 cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyTextBlock("orderedList")}
                  >
                    <span className="w-6 text-left text-xs font-semibold text-slate-400">
                      1.
                    </span>
                    <span>Numbered list</span>
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className={cn(
                        "ml-auto size-3.5 text-slate-600",
                        selectedTextState.activeBlock === "orderedList"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="mx-0.5 h-4 w-px bg-slate-200" />
              <ToolbarButton
                label="Bold"
                disabled={isBusy}
                active={selectedTextState.bold}
                className="size-7 rounded-lg"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <span className="text-[13px] font-semibold">B</span>
              </ToolbarButton>
              <ToolbarButton
                label="Italic"
                disabled={isBusy}
                active={selectedTextState.italic}
                className="size-7 rounded-lg"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <span className="text-[13px] font-semibold italic">I</span>
              </ToolbarButton>
              <ToolbarButton
                label="Underline"
                disabled={isBusy}
                active={selectedTextState.underline}
                className="size-7 rounded-lg"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <span className="text-[13px] font-semibold underline">U</span>
              </ToolbarButton>
              <ToolbarButton
                label="Strikethrough"
                disabled={isBusy}
                active={selectedTextState.strike}
                className="size-7 rounded-lg"
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <span className="text-[13px] font-semibold line-through">
                  S
                </span>
              </ToolbarButton>
              <ToolbarButton
                label="Inline code"
                disabled={isBusy}
                active={selectedTextState.code}
                className="size-7 rounded-lg"
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                <span className="text-xs font-semibold">&lt;&gt;</span>
              </ToolbarButton>
              <ToolbarButton
                label="Code block"
                disabled={isBusy}
                active={selectedTextState.codeBlock}
                className="size-7 rounded-lg"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                <span className="text-[11px] font-semibold">&lt;/&gt;</span>
              </ToolbarButton>
              <span className="mx-0.5 h-4 w-px bg-slate-200" />
              <ToolbarButton
                label="Link"
                disabled={isBusy}
                active={selectedTextState.link}
                className="size-7 rounded-lg"
                onClick={handleLink}
              >
                <HugeiconsIcon
                  icon={Link01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
              </ToolbarButton>
            </BubbleMenu>
          ) : null}
          {editor ? (
            <BubbleMenu
              pluginKey="feedback-comment-media-menu"
              editor={editor}
              updateDelay={0}
              shouldShow={({ editor: currentEditor }) => {
                if (isBusy || !currentEditor.isEditable) {
                  return false;
                }

                return (
                  currentEditor.isActive("feedbackCommentVideo") ||
                  currentEditor.isActive("feedbackCommentImage")
                );
              }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-xl"
            >
              <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
                <button
                  type="button"
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                    selectedMediaState.isActive &&
                      selectedMediaState.align === "left" &&
                      "bg-slate-100 text-slate-700",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => updateSelectedMediaAlign("left")}
                  aria-label="Align media left"
                >
                  <HugeiconsIcon
                    icon={AlignLeftIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                    selectedMediaState.isActive &&
                      selectedMediaState.align === "center" &&
                      "bg-slate-100 text-slate-700",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => updateSelectedMediaAlign("center")}
                  aria-label="Align media center"
                >
                  <HugeiconsIcon
                    icon={AlignHorizontalCenterIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                    selectedMediaState.isActive &&
                      selectedMediaState.align === "right" &&
                      "bg-slate-100 text-slate-700",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => updateSelectedMediaAlign("right")}
                  aria-label="Align media right"
                >
                  <HugeiconsIcon
                    icon={AlignRightIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={MEDIA_WIDTH_MIN_PERCENT}
                  max={MEDIA_WIDTH_MAX_PERCENT}
                  step={1}
                  value={selectedMediaState.width}
                  onChange={handleSelectedMediaWidthChange}
                  onMouseDown={(event) => event.stopPropagation()}
                  className="h-2 w-36 cursor-pointer appearance-none rounded-full bg-slate-100 accent-[#6f6ce8]"
                  aria-label="Media width"
                />
                <span className="w-11 text-right text-sm font-semibold text-slate-700">
                  {selectedMediaState.width}%
                </span>
              </div>
            </BubbleMenu>
          ) : null}
          <EditorContent
            editor={editor}
            className={cn(
              "min-h-[88px]",
              isBusy && "pointer-events-none opacity-80",
              "[&_.ProseMirror]:min-h-[88px] [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-indigo-700 [&_.ProseMirror_a]:underline [&_.ProseMirror_h1]:my-1 [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:leading-tight [&_.ProseMirror_h2]:my-1 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:leading-tight [&_.ProseMirror_h3]:my-1 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:leading-tight [&_.ProseMirror_img]:my-2 [&_.ProseMirror_img]:max-h-56 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-slate-200 [&_.ProseMirror_li]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:my-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_video]:my-2 [&_.ProseMirror_video]:max-h-64 [&_.ProseMirror_video]:max-w-full [&_.ProseMirror_video]:rounded-lg [&_.ProseMirror_video]:border [&_.ProseMirror_video]:border-slate-200",
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 pt-2">
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-[13px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor || isBusy}
            aria-label="Bold"
          >
            B
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-[13px] text-slate-500 italic hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor || isBusy}
            aria-label="Italic"
          >
            I
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-[13px] text-slate-500 underline hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={!editor || isBusy}
            aria-label="Underline"
          >
            U
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-[13px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor || isBusy}
            aria-label="Bullet list"
          >
            L
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={handleLink}
            disabled={!editor || isBusy}
            aria-label="Link"
          >
            <HugeiconsIcon
              icon={Link01Icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => imageInputRef.current?.click()}
            disabled={!editor || isBusy}
            aria-label="Insert image"
          >
            <HugeiconsIcon
              icon={Image01Icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => videoInputRef.current?.click()}
            disabled={!editor || isBusy}
            aria-label="Insert video"
          >
            <HugeiconsIcon
              icon={Video01Icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            onClick={() => attachmentInputRef.current?.click()}
            disabled={!editor || isBusy}
            aria-label="Insert attachment"
          >
            <HugeiconsIcon
              icon={Attachment01Icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        </div>
        {error ? (
          <p className="text-sm text-[#b42318]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end border-t border-slate-200 pt-2">
          <FancyButton.Root
            type="submit"
            variant="neutral"
            size="small"
            disabled={isBusy || editorMeta.isEmpty}
          >
            {isUploading
              ? "Uploading..."
              : createComment.isPending
                ? "Posting..."
                : "Post comment"}
          </FancyButton.Root>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileInput(event, "image")}
          disabled={isBusy}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => void handleFileInput(event, "video")}
          disabled={isBusy}
        />
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(event) => void handleFileInput(event, "attachment")}
          disabled={isBusy}
        />
      </form>
    </div>
  );
}
