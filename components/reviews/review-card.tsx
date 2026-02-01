"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, Sparkles, Send, Loader2, Calendar, User, Chrome } from "lucide-react";
import { generateAiReply, publishReply } from "@/app/actions/reviews";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ReviewCardProps {
  review: {
    id: string;
    author_name: string;
    star_rating: number;
    content: string | null;
    review_date: string;
    reply_text: string | null;
    reply_date: string | null;
    status: string;
    source?: string;
    reviewer_display_name?: string;
    reviewer_photo_url?: string;
    google_review_id?: string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [replyText, setReplyText] = useState(review.reply_text || "");
  const [showReplyBox, setShowReplyBox] = useState(false);

  const handleGenerateAiReply = async () => {
    setIsGenerating(true);
    try {
      const { reply } = await generateAiReply(
        review.content || "",
        review.star_rating,
        review.author_name
      );
      setReplyText(reply);
      setShowReplyBox(true);
      toast({
        title: "Risposta generata!",
        description: "La risposta AI è pronta. Puoi modificarla prima di pubblicarla.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione della risposta",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishReply = async () => {
    if (!replyText.trim()) {
      toast({
        title: "Attenzione",
        description: "La risposta non può essere vuota",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishReply(review.id, replyText);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: "Risposta pubblicata!",
        description: "La tua risposta è stata pubblicata con successo su Google Business Profile.",
      });
      setShowReplyBox(false);
      // Refresh della pagina per mostrare i dati aggiornati
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la pubblicazione della risposta",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Render stelle
  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < review.star_rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = () => {
    if (review.status === "replied") {
      return <Badge variant="default">Risposto</Badge>;
    }
    if (review.star_rating <= 2) {
      return <Badge variant="destructive">Negativa</Badge>;
    }
    return <Badge variant="secondary">Da rispondere</Badge>;
  };

  const getSourceBadge = () => {
    if (review.source === "google") {
      return (
        <Badge variant="outline" className="gap-1">
          <Chrome className="h-3 w-3" />
          Google
        </Badge>
      );
    }
    return null;
  };

  const reviewerName = review.reviewer_display_name || review.author_name;
  const reviewerInitials = reviewerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {review.reviewer_photo_url ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={review.reviewer_photo_url} alt={reviewerName} />
                    <AvatarFallback>{reviewerInitials}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{reviewerInitials}</AvatarFallback>
                  </Avatar>
                )}
                <span className="font-semibold">{reviewerName}</span>
              </div>
              {renderStars()}
              {getStatusBadge()}
              {getSourceBadge()}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(review.review_date), {
                addSuffix: true,
                locale: it,
              })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Testo recensione */}
        {review.content ? (
          <p className="text-sm leading-relaxed">{review.content}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            L'utente non ha lasciato un commento testuale.
          </p>
        )}

        {/* Risposta pubblicata */}
        {review.status === "replied" && review.reply_text && (
          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Send className="h-4 w-4" />
              La tua risposta
              {review.reply_date && (
                <span className="text-xs text-muted-foreground">
                  • {formatDistanceToNow(new Date(review.reply_date), {
                    addSuffix: true,
                    locale: it,
                  })}
                </span>
              )}
            </div>
            <p className="whitespace-pre-line text-sm">{review.reply_text}</p>
          </div>
        )}

        {/* Area risposta (pending) */}
        {review.status === "pending" && (
          <div className="space-y-3">
            {!showReplyBox ? (
              <Button
                onClick={handleGenerateAiReply}
                disabled={isGenerating}
                className="w-full"
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Genera Risposta AI
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Risposta (modifica se necessario)
                  </label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={6}
                    placeholder="Scrivi la tua risposta..."
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePublishReply}
                    disabled={isPublishing}
                    className="flex-1"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Pubblicazione su Google in corso...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Pubblica Risposta
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowReplyBox(false)}
                    variant="outline"
                    disabled={isPublishing}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
