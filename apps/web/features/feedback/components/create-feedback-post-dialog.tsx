"use client";

import {
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowRight01Icon,
  Attachment01Icon,
  Calendar03Icon,
  Cancel01Icon,
  EyeIcon,
  Image01Icon,
  Link01Icon,
  PlusSignIcon,
  SmileIcon,
  Tag01Icon,
  UserIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  EditorContent,
  mergeAttributes,
  Node as TiptapNode,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import { IconPlusCircle } from "@/components/icons/icon-plus-circle";
import { IconSearch } from "@/components/icons/icon-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FancyButton } from "@/components/ui/fancy-button";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_MEDIA_MAX_BYTES,
  FEEDBACK_TITLE_MAX_LENGTH,
} from "~/feedback/lib/constants";
import {
  extractTextFromFeedbackContent,
  hasEmbeddedFeedbackMedia,
  normalizeFeedbackContentToHtml,
} from "~/feedback/lib/rich-content";
import type {
  FeedbackBoardItem,
  FeedbackMediaType,
  FeedbackPostItem,
  FeedbackStatusItem,
  FeedbackTagItem,
  FeedbackUploadedMedia,
} from "~/feedback/lib/types";
import { postsQueryKeys } from "~/posts/lib/query-keys";

interface CreateFeedbackPostDialogProps {
  workspaceSlug: string;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name">;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label" | "isClosed">;
  availableTags: FeedbackTagItem[];
  canAssignTags: boolean;
  viewer?: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  onUnauthorized?: () => void;
  onPostCreated?: (post: FeedbackPostItem) => void;
}

interface CreatePostResponse {
  post: Omit<FeedbackPostItem, "createdAt"> & { createdAt: string | Date };
}

interface UploadMediaResponse {
  media: FeedbackUploadedMedia;
}

interface EmojiSelection {
  native?: string;
}

const EMOJI_PICKER_OFFSET = 8;
const EMOJI_PICKER_VIEWPORT_PADDING = 12;
const EMOJI_PICKER_FALLBACK_WIDTH = 316;
const EMOJI_PICKER_FALLBACK_HEIGHT = 435;
const VIDEO_WIDTH_MIN_PERCENT = 40;
const VIDEO_WIDTH_MAX_PERCENT = 100;

type MediaAlign = "left" | "center" | "right";

function clampVideoWidthPercent(value: number) {
  if (!Number.isFinite(value)) {
    return VIDEO_WIDTH_MAX_PERCENT;
  }

  return Math.min(
    VIDEO_WIDTH_MAX_PERCENT,
    Math.max(VIDEO_WIDTH_MIN_PERCENT, Math.round(value)),
  );
}

function normalizeMediaAlign(value: unknown): MediaAlign {
  if (value === "left" || value === "right" || value === "center") {
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
  const clampedWidth = clampVideoWidthPercent(widthPercent);
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
  const clampedWidth = clampVideoWidthPercent(widthPercent);
  const margins = getMediaInlineMargins(align);

  return [
    "display:block",
    `width:${clampedWidth}%`,
    "max-width:100%",
    `margin-left:${margins.left}`,
    `margin-right:${margins.right}`,
  ].join(";");
}

const EmojiMartPicker = dynamic(() => import("@emoji-mart/react"), {
  ssr: false,
});

const FeedbackImage = TiptapNode.create({
  name: "feedbackImage",
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
        default: VIDEO_WIDTH_MAX_PERCENT,
        parseHTML: (element) =>
          clampVideoWidthPercent(Number(element.getAttribute("data-width"))),
        renderHTML: (attributes) => ({
          "data-width": String(
            clampVideoWidthPercent(Number(attributes.width)),
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
    const width = clampVideoWidthPercent(Number(node.attrs.width));
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

const FeedbackVideo = TiptapNode.create({
  name: "feedbackVideo",
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
        default: VIDEO_WIDTH_MAX_PERCENT,
        parseHTML: (element) =>
          clampVideoWidthPercent(Number(element.getAttribute("data-width"))),
        renderHTML: (attributes) => ({
          "data-width": String(
            clampVideoWidthPercent(Number(attributes.width)),
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
    const width = clampVideoWidthPercent(Number(node.attrs.width));
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

let cachedEmojiPickerData: Record<string, unknown> | null = null;
let emojiPickerDataRequest: Promise<Record<string, unknown>> | null = null;

function getEmojiPickerData() {
  if (cachedEmojiPickerData) {
    return Promise.resolve(cachedEmojiPickerData);
  }

  if (!emojiPickerDataRequest) {
    emojiPickerDataRequest = import("@emoji-mart/data")
      .then((module) => {
        cachedEmojiPickerData = module.default as Record<string, unknown>;
        return cachedEmojiPickerData;
      })
      .finally(() => {
        emojiPickerDataRequest = null;
      });
  }

  return emojiPickerDataRequest;
}

function normalizePost(
  post: Omit<FeedbackPostItem, "createdAt"> & { createdAt: string | Date },
): FeedbackPostItem {
  return {
    ...post,
    createdAt:
      post.createdAt instanceof Date
        ? post.createdAt
        : new Date(post.createdAt),
  };
}

function slugifyTitle(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return normalized || "post";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getViewerInitials(viewer: CreateFeedbackPostDialogProps["viewer"]) {
  const source = viewer?.name || viewer?.email || "User";
  const parts = source.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0]?.slice(0, 1).toUpperCase() || "U";
  }

  return `${parts[0]?.slice(0, 1) || ""}${parts[1]?.slice(0, 1) || ""}`.toUpperCase();
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

export function CreateFeedbackPostDialog({
  workspaceSlug,
  defaultBoard,
  defaultStatus,
  availableTags,
  canAssignTags,
  viewer,
  onUnauthorized,
  onPostCreated,
}: CreateFeedbackPostDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [emojiPickerData, setEmojiPickerData] = useState<Record<
    string,
    unknown
  > | null>(() => cachedEmojiPickerData);
  const [isEmojiDataLoading, setIsEmojiDataLoading] = useState(false);
  const [editorHtml, setEditorHtml] = useState("<p></p>");
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const tagPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const postsKey = postsQueryKeys.byWorkspace(workspaceSlug);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
      }),
      FeedbackImage,
      FeedbackVideo,
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[80px] pb-3 text-base leading-relaxed text-slate-900 outline-none",
      },
    },
    content: "<p></p>",
    onUpdate: ({ editor: currentEditor }) => {
      setEditorHtml(currentEditor.getHTML());
      setError(null);
    },
    onFocus: () => {
      setIsEditorFocused(true);
    },
    onBlur: () => {
      setIsEditorFocused(false);
    },
  });

  const selectedMedia = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const activeNodeType = currentEditor?.isActive("feedbackVideo")
        ? "feedbackVideo"
        : currentEditor?.isActive("feedbackImage")
          ? "feedbackImage"
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
        width: clampVideoWidthPercent(Number(attributes.width)),
        align: normalizeMediaAlign(attributes.align),
      };
    },
  });

  const selectedMediaState = selectedMedia ?? {
    isActive: false,
    activeNodeType: null,
    width: VIDEO_WIDTH_MAX_PERCENT,
    align: "center" as MediaAlign,
  };

  const createPost = useMutation<
    FeedbackPostItem,
    Error,
    { title: string; content: string; tagIds: string[] },
    { previousPosts?: FeedbackPostItem[]; optimisticId: string }
  >({
    mutationKey: ["posts", workspaceSlug, "create"],
    mutationFn: async (input) => {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/feedback/posts`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized?.();
          throw new Error("Please sign in to create a post");
        }

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not create post");
      }

      const payload = (await response.json()) as CreatePostResponse;
      return normalizePost(payload.post);
    },
    onMutate: async (input) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: postsKey, exact: true });

      const previousPosts =
        queryClient.getQueryData<FeedbackPostItem[]>(postsKey);
      const optimisticId = `optimistic:${uuidv4()}`;
      const optimisticPost: FeedbackPostItem = {
        id: optimisticId,
        boardId: defaultBoard.id,
        statusId: defaultStatus.id,
        title: input.title,
        slug: slugifyTitle(input.title),
        content: input.content,
        upvoteCount: 0,
        commentCount: 0,
        createdAt: new Date(),
        statusLabel: defaultStatus.label,
        statusKey: defaultStatus.key,
        statusIsClosed: defaultStatus.isClosed,
        boardName: defaultBoard.name,
        tags: availableTags.filter((tag) => input.tagIds.includes(tag.id)),
        viewerHasVoted: false,
      };

      queryClient.setQueryData<FeedbackPostItem[]>(postsKey, (posts = []) => [
        optimisticPost,
        ...posts,
      ]);

      return { previousPosts, optimisticId };
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(postsKey, context.previousPosts);
      }

      setError(mutationError.message || "Could not create post");
    },
    onSuccess: (post, _variables, context) => {
      queryClient.setQueryData<FeedbackPostItem[]>(postsKey, (posts = []) => {
        let replaced = false;
        const nextPosts = posts.map((currentPost) => {
          if (currentPost.id !== context.optimisticId) {
            return currentPost;
          }

          replaced = true;
          return post;
        });

        const mergedPosts = replaced ? nextPosts : [post, ...nextPosts];
        const unique = new Map<string, FeedbackPostItem>();
        for (const currentPost of mergedPosts) {
          if (!unique.has(currentPost.id)) {
            unique.set(currentPost.id, currentPost);
          }
        }

        return [...unique.values()];
      });

      queryClient.setQueryData(
        postsQueryKeys.detail(workspaceSlug, post.id),
        post,
      );

      onPostCreated?.(post);

      setTitle("");
      editor?.commands.setContent("<p></p>");
      setEditorHtml("<p></p>");
      setIsTagPickerOpen(false);
      setTagSearchQuery("");
      setIsEmojiPickerOpen(false);
      setSelectedTagIds([]);
      if (!createMore) {
        setIsOpen(false);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsKey, exact: true });
    },
  });

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
          onUnauthorized?.();
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

  const isPending = createPost.isPending;
  const isUploading = uploadMedia.isPending;
  const isBusy = isPending || isUploading;

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

  const filteredTagOptions = useMemo(() => {
    const query = tagSearchQuery.trim().toLowerCase();
    if (!query.length) {
      return availableTags;
    }

    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(query),
    );
  }, [availableTags, tagSearchQuery]);

  const loadEmojiPickerData = useCallback(() => {
    if (emojiPickerData || isEmojiDataLoading) {
      return;
    }

    setIsEmojiDataLoading(true);

    void getEmojiPickerData()
      .then((data) => {
        setEmojiPickerData(data);
      })
      .catch(() => {
        setError("Could not load emojis");
        setIsEmojiPickerOpen(false);
      })
      .finally(() => {
        setIsEmojiDataLoading(false);
      });
  }, [emojiPickerData, isEmojiDataLoading]);

  const updateEmojiPickerPosition = useCallback(() => {
    const trigger = emojiTriggerRef.current;
    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const pickerWidth =
      emojiPickerRef.current?.offsetWidth ?? EMOJI_PICKER_FALLBACK_WIDTH;
    const pickerHeight =
      emojiPickerRef.current?.offsetHeight ?? EMOJI_PICKER_FALLBACK_HEIGHT;
    const maxLeft =
      window.innerWidth - EMOJI_PICKER_VIEWPORT_PADDING - pickerWidth;

    const left = Math.min(
      Math.max(triggerRect.left, EMOJI_PICKER_VIEWPORT_PADDING),
      Math.max(EMOJI_PICKER_VIEWPORT_PADDING, maxLeft),
    );

    let top = triggerRect.top - pickerHeight - EMOJI_PICKER_OFFSET;
    if (top < EMOJI_PICKER_VIEWPORT_PADDING) {
      top = Math.min(
        triggerRect.bottom + EMOJI_PICKER_OFFSET,
        window.innerHeight - EMOJI_PICKER_VIEWPORT_PADDING - pickerHeight,
      );
    }

    setEmojiPickerPosition({
      left,
      top: Math.max(EMOJI_PICKER_VIEWPORT_PADDING, top),
    });
  }, []);

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      return;
    }

    updateEmojiPickerPosition();
    let frameId: number | null = null;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (emojiPickerRef.current?.contains(target)) {
        return;
      }

      if (emojiTriggerRef.current?.contains(target)) {
        return;
      }

      setIsEmojiPickerOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEmojiPickerOpen(false);
      }
    };

    const handleViewportChange = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateEmojiPickerPosition();
      });
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, {
      capture: true,
      passive: true,
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isEmojiPickerOpen, updateEmojiPickerPosition]);

  useEffect(() => {
    if (!isTagPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (tagPickerRef.current?.contains(target)) {
        return;
      }

      setIsTagPickerOpen(false);
      setTagSearchQuery("");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTagPickerOpen(false);
        setTagSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTagPickerOpen]);

  function closeDialog() {
    if (isBusy) {
      return;
    }

    setError(null);
    setIsTagPickerOpen(false);
    setTagSearchQuery("");
    setIsEmojiPickerOpen(false);
    setSelectedTagIds([]);
    setIsOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      closeDialog();
      return;
    }

    setIsTagPickerOpen(false);
    setTagSearchQuery("");
    setIsEmojiPickerOpen(false);
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedTitle = title.trim();
    const contentHtml = editorMeta.html;
    const contentText = editorMeta.text;
    const hasMedia = hasEmbeddedFeedbackMedia(contentHtml);

    if (!normalizedTitle.length) {
      setError("Title is required");
      return;
    }

    if (!contentText.length && !hasMedia) {
      setError("Description is required");
      return;
    }

    await createPost
      .mutateAsync({
        title: normalizedTitle,
        content: contentHtml,
        tagIds: selectedTagIds,
      })
      .catch(() => undefined);
  }

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
            type: "feedbackImage",
            attrs: {
              src: uploaded.url,
              alt: uploaded.fileName,
              width: VIDEO_WIDTH_MAX_PERCENT,
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
            type: "feedbackVideo",
            attrs: {
              src: uploaded.url,
              controls: true,
              preload: "metadata",
              width: VIDEO_WIDTH_MAX_PERCENT,
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

  function updateSelectedMediaAlign(align: MediaAlign) {
    if (!editor || !selectedMediaState.isActive) {
      return;
    }

    if (selectedMediaState.activeNodeType === "feedbackVideo") {
      editor.chain().focus().updateAttributes("feedbackVideo", { align }).run();
      return;
    }

    if (selectedMediaState.activeNodeType === "feedbackImage") {
      editor.chain().focus().updateAttributes("feedbackImage", { align }).run();
    }
  }

  function handleSelectedMediaWidthChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!editor || !selectedMediaState.isActive) {
      return;
    }

    const width = clampVideoWidthPercent(Number(event.target.value));

    if (selectedMediaState.activeNodeType === "feedbackVideo") {
      editor.chain().focus().updateAttributes("feedbackVideo", { width }).run();
      return;
    }

    if (selectedMediaState.activeNodeType === "feedbackImage") {
      editor.chain().focus().updateAttributes("feedbackImage", { width }).run();
    }
  }

  function toggleCreateMore() {
    setCreateMore((value) => !value);
  }

  function setTagSelection(tagId: string, checked: boolean) {
    setSelectedTagIds((currentTagIds) => {
      if (checked) {
        if (currentTagIds.includes(tagId)) {
          return currentTagIds;
        }

        return [...currentTagIds, tagId];
      }

      return currentTagIds.filter((currentTagId) => currentTagId !== tagId);
    });
  }

  function toggleEmojiPicker() {
    if (!editor || isBusy) {
      return;
    }

    setIsEmojiPickerOpen((value) => {
      const nextValue = !value;
      if (nextValue) {
        loadEmojiPickerData();
        window.requestAnimationFrame(() => {
          updateEmojiPickerPosition();
        });
      }
      return nextValue;
    });
  }

  function handleEmojiSelect(emoji: EmojiSelection) {
    if (!emoji.native) {
      return;
    }

    editor?.chain().focus().insertContent(emoji.native).run();
    setIsEmojiPickerOpen(false);
  }

  function handleTitleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    editor?.chain().focus().run();
  }

  const viewerInitials = getViewerInitials(viewer);

  return (
    <>
      <FancyButton.Root
        variant="neutral"
        size="xsmall"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <IconPlusCircle className="size-4" />
        Create post
      </FancyButton.Root>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[670px]"
        >
          <form className="flex max-h-[82vh] flex-col" onSubmit={handleSubmit}>
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar size="sm" className="border border-slate-200">
                  <AvatarImage
                    src={viewer?.image || undefined}
                    alt={viewer?.name || "User avatar"}
                  />
                  <AvatarFallback className="text-sm">
                    {viewerInitials}
                  </AvatarFallback>
                </Avatar>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-3 text-slate-400"
                />
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-800">
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    strokeWidth={2}
                    className="size-3.5 text-amber-500"
                  />
                  Idea o bug
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-slate-500"
                onClick={closeDialog}
                disabled={isBusy}
                aria-label="Close dialog"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </header>

            <div className="min-h-[150px] max-h-[470px] overflow-y-auto px-4 py-4 sm:px-5">
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setError(null);
                }}
                onKeyDown={handleTitleKeyDown}
                placeholder="Title of your post"
                maxLength={FEEDBACK_TITLE_MAX_LENGTH}
                className="w-full border-0 bg-transparent text-base font-normal text-slate-700 placeholder:text-slate-400 dark:bg-transparent dark:text-white focus-within:outline-none focus-within:ring-0 dark:focus-within:outline-none sm:text-lg"
                disabled={isBusy}
                required
              />

              <div className="relative mt-3 min-h-[80px]">
                {editorMeta.isEmpty && !isEditorFocused ? (
                  <p
                    data-placeholder="Post description..."
                    className="absolute inset-0 h-full w-full pointer-events-none text-base font-normal text-slate-400 after:text-background-accent/60 after:dark:text-foreground/60 is-editor-empty"
                  >
                    Post description...
                  </p>
                ) : null}

                {editor ? (
                  <BubbleMenu
                    pluginKey="feedback-media-menu"
                    editor={editor}
                    updateDelay={0}
                    shouldShow={({ editor: currentEditor }) => {
                      if (isBusy || !currentEditor.isEditable) {
                        return false;
                      }

                      return (
                        currentEditor.isActive("feedbackVideo") ||
                        currentEditor.isActive("feedbackImage")
                      );
                    }}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-xl"
                  >
                    <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => updateSelectedMediaAlign("left")}
                        className={cn(
                          "size-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                          selectedMediaState.isActive &&
                            selectedMediaState.align === "left" &&
                            "bg-slate-100 text-slate-700",
                        )}
                        aria-label="Align media left"
                      >
                        <HugeiconsIcon
                          icon={AlignLeftIcon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => updateSelectedMediaAlign("center")}
                        className={cn(
                          "size-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                          selectedMediaState.isActive &&
                            selectedMediaState.align === "center" &&
                            "bg-slate-100 text-slate-700",
                        )}
                        aria-label="Align media center"
                      >
                        <HugeiconsIcon
                          icon={AlignHorizontalCenterIcon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => updateSelectedMediaAlign("right")}
                        className={cn(
                          "size-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                          selectedMediaState.isActive &&
                            selectedMediaState.align === "right" &&
                            "bg-slate-100 text-slate-700",
                        )}
                        aria-label="Align media right"
                      >
                        <HugeiconsIcon
                          icon={AlignRightIcon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={VIDEO_WIDTH_MIN_PERCENT}
                        max={VIDEO_WIDTH_MAX_PERCENT}
                        step={1}
                        value={selectedMediaState.width}
                        onChange={handleSelectedMediaWidthChange}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="h-2 w-40 cursor-pointer appearance-none rounded-full bg-slate-100 accent-[#6f6ce8]"
                        aria-label="Media width"
                      />
                      <span className="w-12 text-right text-sm font-semibold text-slate-700">
                        {selectedMediaState.width}%
                      </span>
                    </div>
                  </BubbleMenu>
                ) : null}

                {editor ? (
                  <BubbleMenu
                    editor={editor}
                    updateDelay={80}
                    shouldShow={({ editor: currentEditor, state }) => {
                      if (
                        isBusy ||
                        !currentEditor.isEditable ||
                        currentEditor.isActive("feedbackVideo") ||
                        currentEditor.isActive("feedbackImage")
                      ) {
                        return false;
                      }

                      return !state.selection.empty;
                    }}
                    className="flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 shadow-xl"
                  >
                    <ToolbarButton
                      label="Paragraph"
                      disabled={isBusy}
                      active={editor.isActive("paragraph")}
                      className="size-8 rounded-xl"
                      onClick={() =>
                        editor.chain().focus().setParagraph().run()
                      }
                    >
                      <span className="text-sm font-semibold">P</span>
                    </ToolbarButton>
                    <span className="mx-0.5 h-5 w-px bg-slate-200" />
                    <ToolbarButton
                      label="Bold"
                      disabled={isBusy}
                      active={editor.isActive("bold")}
                      className="size-8 rounded-xl"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                      <span className="text-[14px] font-semibold">B</span>
                    </ToolbarButton>
                    <ToolbarButton
                      label="Italic"
                      disabled={isBusy}
                      active={editor.isActive("italic")}
                      className="size-8 rounded-xl"
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                    >
                      <span className="text-[14px] font-semibold italic">
                        I
                      </span>
                    </ToolbarButton>
                    <ToolbarButton
                      label="Underline"
                      disabled={isBusy}
                      active={editor.isActive("underline")}
                      className="size-8 rounded-xl"
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                    >
                      <span className="text-[14px] font-semibold underline">
                        U
                      </span>
                    </ToolbarButton>
                    <ToolbarButton
                      label="Strikethrough"
                      disabled={isBusy}
                      active={editor.isActive("strike")}
                      className="size-8 rounded-xl"
                      onClick={() =>
                        editor.chain().focus().toggleStrike().run()
                      }
                    >
                      <span className="text-[14px] font-semibold line-through">
                        S
                      </span>
                    </ToolbarButton>
                    <ToolbarButton
                      label="Bullet list"
                      disabled={isBusy}
                      active={editor.isActive("bulletList")}
                      className="size-8 rounded-xl"
                      onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                      }
                    >
                      <span className="text-[14px] font-semibold">L</span>
                    </ToolbarButton>
                    <ToolbarButton
                      label="Inline code"
                      disabled={isBusy}
                      active={editor.isActive("code")}
                      className="size-8 rounded-xl"
                      onClick={() => editor.chain().focus().toggleCode().run()}
                    >
                      <span className="text-sm font-semibold">&lt;&gt;</span>
                    </ToolbarButton>
                    <ToolbarButton
                      label="Code block"
                      disabled={isBusy}
                      active={editor.isActive("codeBlock")}
                      className="size-8 rounded-xl"
                      onClick={() =>
                        editor.chain().focus().toggleCodeBlock().run()
                      }
                    >
                      <span className="text-xs font-semibold">&lt;/&gt;</span>
                    </ToolbarButton>
                    <span className="mx-0.5 h-5 w-px bg-slate-200" />
                    <ToolbarButton
                      label="Link"
                      disabled={isBusy}
                      active={editor.isActive("link")}
                      className="size-8 rounded-xl"
                      onClick={handleLink}
                    >
                      <HugeiconsIcon
                        icon={Link01Icon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </ToolbarButton>
                  </BubbleMenu>
                ) : null}

                <EditorContent
                  editor={editor}
                  className="feedback-post-editor [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-relaxed [&_.ProseMirror_a]:text-indigo-700 [&_.ProseMirror_a]:underline [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:max-h-[420px] [&_.ProseMirror_img]:w-auto [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-slate-200 [&_.ProseMirror_li]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_video]:my-3 [&_.ProseMirror_video]:aspect-video [&_.ProseMirror_video]:w-full [&_.ProseMirror_video]:max-h-[360px] [&_.ProseMirror_video]:rounded-xl [&_.ProseMirror_video]:border [&_.ProseMirror_video]:border-slate-200 [&_.ProseMirror_video]:bg-black [&_.ProseMirror_video]:object-contain"
                />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-wrap items-center gap-0.5 border-t border-slate-200 px-4 py-1"
            >
              <ToolbarButton
                label="Bold"
                disabled={!editor || isBusy}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <span className="text-[13px] font-semibold">B</span>
              </ToolbarButton>
              <ToolbarButton
                label="Italic"
                disabled={!editor || isBusy}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <span className="text-[13px] font-semibold italic">I</span>
              </ToolbarButton>
              <ToolbarButton
                label="Underline"
                disabled={!editor || isBusy}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <span className="text-[13px] font-semibold underline">U</span>
              </ToolbarButton>
              <ToolbarButton
                label="Bullet list"
                disabled={!editor || isBusy}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <span className="text-[13px] font-semibold">L</span>
              </ToolbarButton>
              <ToolbarButton
                label="Link"
                disabled={!editor || isBusy}
                onClick={handleLink}
              >
                <HugeiconsIcon
                  icon={Link01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </ToolbarButton>
              <ToolbarButton
                label="Insert image"
                disabled={!editor || isBusy}
                onClick={() => imageInputRef.current?.click()}
              >
                <HugeiconsIcon
                  icon={Image01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </ToolbarButton>
              <ToolbarButton
                label="Insert video"
                disabled={!editor || isBusy}
                onClick={() => videoInputRef.current?.click()}
              >
                <HugeiconsIcon
                  icon={Video01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </ToolbarButton>
              <ToolbarButton
                label="Insert attachment"
                disabled={!editor || isBusy}
                onClick={() => attachmentInputRef.current?.click()}
              >
                <HugeiconsIcon
                  icon={Attachment01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </ToolbarButton>
              <button
                ref={emojiTriggerRef}
                type="button"
                disabled={!editor || isBusy}
                aria-label="Insert emoji"
                aria-expanded={isEmojiPickerOpen}
                onClick={toggleEmojiPicker}
                onMouseEnter={loadEmojiPickerData}
                onFocus={loadEmojiPickerData}
                className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 outline-none transition hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50"
              >
                <HugeiconsIcon
                  icon={SmileIcon}
                  strokeWidth={2}
                  className="size-4"
                />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.04 }}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-1"
            >
              <div className="flex flex-wrap items-center gap-1">
                <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-800">
                  <span className="mr-1.5 inline-flex size-1.5 rounded-full bg-sky-500" />
                  {defaultStatus.label}
                </span>
                {canAssignTags && availableTags.length > 0 ? (
                  <div ref={tagPickerRef} className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 rounded-full border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800",
                        selectedTagIds.length > 0 &&
                          "border-slate-300 bg-slate-50 text-slate-800",
                      )}
                      onClick={() =>
                        setIsTagPickerOpen((current) => {
                          const next = !current;
                          if (next) {
                            setTagSearchQuery("");
                          }
                          return next;
                        })
                      }
                      aria-expanded={isTagPickerOpen}
                      aria-label="Select tags"
                    >
                      <HugeiconsIcon
                        icon={Tag01Icon}
                        strokeWidth={2}
                        className="size-3.5 shrink-0"
                      />
                      <span>
                        {selectedTagIds.length
                          ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""}`
                          : "Tags"}
                      </span>
                    </Button>
                    {isTagPickerOpen ? (
                      <div className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-[240px] overflow-hidden rounded-[11px] border border-slate-200 bg-white shadow-[0_18px_32px_-20px_rgba(17,18,20,0.45)]">
                        <div className="relative border-b border-slate-200 px-3 py-2">
                          <IconSearch className="pointer-events-none absolute top-1/2 left-5 size-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={tagSearchQuery}
                            onChange={(event) =>
                              setTagSearchQuery(event.target.value)
                            }
                            placeholder="Search tag..."
                            className="h-8 w-full rounded-[8px] border border-slate-200 bg-slate-50 pl-8 pr-2 text-[13px] font-medium text-slate-700 placeholder:text-slate-400 outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Public tags
                          </p>
                          <HugeiconsIcon
                            icon={EyeIcon}
                            strokeWidth={2}
                            className="size-3.5 text-slate-400"
                            aria-hidden
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto p-1.5">
                          {filteredTagOptions.length ? (
                            filteredTagOptions.map((tag) => {
                              const checked = selectedTagIds.includes(tag.id);

                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() =>
                                    setTagSelection(tag.id, !checked)
                                  }
                                  aria-pressed={checked}
                                  className={cn(
                                    "flex h-8 w-full items-center gap-2 rounded-[9px] px-2.5 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50",
                                    checked && "bg-slate-100",
                                  )}
                                >
                                  {tag.color ? (
                                    <span
                                      className="size-2 rounded-full"
                                      style={{ backgroundColor: tag.color }}
                                    />
                                  ) : (
                                    <span className="size-2 rounded-full bg-slate-300" />
                                  )}
                                  <span className="min-w-0 flex-1 truncate">
                                    {tag.name}
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <p className="px-2 py-3 text-xs font-medium text-slate-500">
                              No tags found.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled
                    className="size-7 rounded-full border-slate-200 bg-white text-slate-500"
                    aria-label="Set tags"
                  >
                    <HugeiconsIcon
                      icon={Tag01Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isBusy}
                  className="size-7 rounded-full border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Set owner"
                >
                  <HugeiconsIcon
                    icon={UserIcon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isBusy}
                  className="size-7 rounded-full border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Set due date"
                >
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </Button>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={createMore}
                  onClick={toggleCreateMore}
                  disabled={isBusy}
                  className={cn(
                    "relative inline-flex h-6 w-10 items-center rounded-full border border-transparent transition-colors",
                    createMore ? "bg-[#8f9cf4]" : "bg-slate-300",
                  )}
                  aria-label="Create more after submit"
                >
                  <span
                    className={cn(
                      "inline-block size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(17,18,20,0.2)] transition-transform",
                      createMore ? "translate-x-5" : "translate-x-1",
                    )}
                  />
                </button>
                <span className="text-[13px] font-semibold text-slate-600">
                  Create more
                </span>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[11px] border-[#8f9cf4] bg-[#8f9cf4] px-5 text-[13px] font-semibold text-white hover:border-[#828ff0] hover:bg-[#828ff0] hover:text-white"
                  disabled={
                    isBusy || !title.trim().length || editorMeta.isEmpty
                  }
                >
                  {isUploading
                    ? "Uploading..."
                    : isPending
                      ? "Submitting..."
                      : "Submit Post"}
                </Button>
              </div>
            </motion.div>

            {error ? (
              <div className="border-t border-slate-200 px-5 py-3 text-sm text-[#b42318]">
                {error}
              </div>
            ) : null}

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
          {isEmojiPickerOpen &&
          emojiPickerPosition &&
          typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={emojiPickerRef}
                  style={{
                    left: emojiPickerPosition.left,
                    top: emojiPickerPosition.top,
                  }}
                  className="fixed z-[80] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                >
                  {emojiPickerData ? (
                    <EmojiMartPicker
                      data={emojiPickerData}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                      set="native"
                      navPosition="bottom"
                      previewPosition="none"
                      skinTonePosition="none"
                      perLine={8}
                      emojiSize={22}
                      emojiButtonSize={36}
                    />
                  ) : (
                    <div className="flex h-[435px] w-[316px] items-center justify-center text-sm font-medium text-slate-500">
                      Loading emojis...
                    </div>
                  )}
                </div>,
                document.body,
              )
            : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
