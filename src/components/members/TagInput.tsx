import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags, useMemberTags, useCreateTag, useAddMemberTag, useRemoveMemberTag, Tag } from "@/hooks/useTags";
import { X, Plus, Tag as TagIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  memberId: string | undefined;
  disabled?: boolean;
}

export function TagInput({ memberId, disabled }: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const { data: allTags = [], isLoading: tagsLoading } = useTags();
  const { data: memberTags = [], isLoading: memberTagsLoading } = useMemberTags(memberId);
  const createTag = useCreateTag();
  const addMemberTag = useAddMemberTag();
  const removeMemberTag = useRemoveMemberTag();

  const memberTagIds = memberTags.map(mt => mt.tag_id);
  const availableTags = allTags.filter(t => !memberTagIds.includes(t.id));
  
  // Filter tags based on input
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isLoading = tagsLoading || memberTagsLoading;
  const isAdding = createTag.isPending || addMemberTag.isPending;

  const handleSelectTag = async (tag: Tag) => {
    if (!memberId) return;
    await addMemberTag.mutateAsync({ memberId, tagId: tag.id });
    setInputValue("");
    setOpen(false);
  };

  const handleCreateAndAddTag = async () => {
    if (!memberId || !inputValue.trim()) return;
    
    try {
      const tag = await createTag.mutateAsync(inputValue.trim());
      await addMemberTag.mutateAsync({ memberId, tagId: tag.id });
      setInputValue("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!memberId) return;
    await removeMemberTag.mutateAsync({ memberId, tagId });
  };

  // Check if exact match exists
  const exactMatch = allTags.find(t => t.name.toLowerCase() === inputValue.toLowerCase());
  const canCreate = inputValue.trim().length > 0 && !exactMatch;

  if (!memberId) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TagIcon className="h-5 w-5 text-primary" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sla het lid eerst op om tags toe te voegen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TagIcon className="h-5 w-5 text-primary" />
          Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tags */}
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : memberTags.length === 0 ? (
            <span className="text-sm text-muted-foreground">Geen tags</span>
          ) : (
            memberTags.map((mt) => (
              <Badge
                key={mt.id}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {mt.tag?.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(mt.tag_id)}
                  disabled={disabled || removeMemberTag.isPending}
                  className="ml-1 hover:bg-muted rounded p-0.5 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        {/* Add tag */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || isAdding}
              className="gap-2"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tag toevoegen
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Zoek of maak tag..."
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {canCreate ? (
                    <button
                      type="button"
                      onClick={handleCreateAndAddTag}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      "{inputValue}" aanmaken
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Geen tags gevonden</span>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleSelectTag(tag)}
                    >
                      <TagIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                      {tag.name}
                    </CommandItem>
                  ))}
                  {canCreate && filteredTags.length > 0 && (
                    <CommandItem
                      value={`create-${inputValue}`}
                      onSelect={handleCreateAndAddTag}
                      className="text-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      "{inputValue}" aanmaken
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
