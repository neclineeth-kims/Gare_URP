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
import type { BoqItemWithCosts } from "@/types/boq";
import { cn } from "@/lib/utils";

type BoqTableProps = {
  data: BoqItemWithCosts[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string | null) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: "code" | "name") => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

export default function BoqTable({
  data,
  selectedId,
  isLoading,
  onSelect,
  onSearchChange,
  onSortChange,
  onAdd,
  onDelete,
}: BoqTableProps) {
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
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 w-full sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search BoQ items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search BoQ items"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Sort options">
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSortChange("code")}>
              Sort by Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("name")}>
              Sort by Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={onAdd}
          aria-label="Add new BoQ item"
          className="ml-auto md:ml-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add BoQ Item
        </Button>
      </div>

      {(isSearching && searchInput) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
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
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Unit Rate DC</TableHead>
                  <TableHead className="text-right">Unit Rate DP</TableHead>
                  <TableHead className="text-right">Unit Rate TC</TableHead>
                  <TableHead className="text-right">Total TC</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
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
              {searchInput ? "No BoQ items found" : "No BoQ items yet"}
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchInput
                ? "Try adjusting your search terms or create a new BoQ item."
                : "Click 'Add BoQ Item' to create your first BoQ item."}
            </p>
          </div>
        ) : (
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Rate DC</TableHead>
                <TableHead className="text-right">Unit Rate DP</TableHead>
                <TableHead className="text-right">Unit Rate TC</TableHead>
                <TableHead className="text-right">Total TC</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    index % 2 === 1 && "bg-muted/20",
                    selectedId === item.id &&
                      "bg-primary/10 border-l-2 border-l-primary",
                    "hover:bg-muted/40"
                  )}
                  onClick={() => onSelect(item.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(item.id);
                    }
                  }}
                  aria-label={`Select BoQ item ${item.code} - ${item.name}`}
                >
                  <TableCell className="font-mono font-medium">
                    {item.code}
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.quantity.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.costs.unitRateDC.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.costs.unitRateDP.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.costs.unitRateTC.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.costs.totalTC.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
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
                        <DropdownMenuItem
                          onClick={(e) => handleEdit(item.id, e)}
                        >
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
