"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import type { EquipmentWithCostsClient } from "@/types/equipment";
import { cn } from "@/lib/utils";

type EquipmentTableProps = {
  data: EquipmentWithCostsClient[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string | null) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: "code" | "name") => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

export default function EquipmentTable({
  data,
  selectedId,
  isLoading,
  onSelect,
  onSearchChange,
  onSortChange,
  onAdd,
  onDelete,
}: EquipmentTableProps) {
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
      setIsSearching(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 w-full sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search equipment"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange("code")}
            aria-label="Sort by code"
          >
            Sort by Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange("name")}
            aria-label="Sort by name"
          >
            Sort by Name
          </Button>
          <Button onClick={onAdd} aria-label="Add new equipment">
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </div>

      {isSearching && searchInput && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Searching...
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-md border">
        {isLoading ? (
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Direct Cost (EDC)</TableHead>
                  <TableHead className="text-right">Depreciation (EDP)</TableHead>
                  <TableHead className="text-right">Total Cost (ETC)</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              {searchInput ? "No equipment found" : "No equipment yet"}
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchInput
                ? "Try adjusting your search terms or create a new equipment item."
                : "Click 'Add Equipment' to create your first equipment item."}
            </p>
          </div>
        ) : (
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Direct Cost (EDC)</TableHead>
                <TableHead className="text-right">Depreciation (EDP)</TableHead>
                <TableHead className="text-right">Total Cost (ETC)</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    index % 2 === 0 && "bg-muted/30",
                    selectedId === item.id && "bg-primary/10 border-l-2 border-l-primary",
                    "hover:bg-muted/50"
                  )}
                  onClick={() => onSelect(item.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(item.id);
                    }
                  }}
                  aria-label={`Select equipment ${item.code} - ${item.name}`}
                >
                  <TableCell className="font-mono font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.costs.edc.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.costs.edp.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.costs.etc.toFixed(2)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${item.code}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEdit(item.id, e)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeleteClick(item.id, e)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
