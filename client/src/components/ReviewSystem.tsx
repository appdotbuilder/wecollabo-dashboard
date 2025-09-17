import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, ThumbsUp, MessageCircle, Building } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { CreateReviewInput } from '../../../server/src/schema';
import type { UserProfileResponse } from '../../../server/src/handlers/get_user_profile';
import type { ReviewWithBrandInfo } from '../../../server/src/handlers/get_influencer_reviews';

interface ReviewSystemProps {
  influencerId: number;
  currentUser?: UserProfileResponse | null;
  isViewOnly?: boolean;
}

export function ReviewSystem({ influencerId, currentUser, isViewOnly = false }: ReviewSystemProps) {
  const [reviews, setReviews] = useState<ReviewWithBrandInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getInfluencerReviews.query({ influencer_user_id: influencerId });
      setReviews(result);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [influencerId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !rating || !feedback.trim()) return;

    setIsSubmitting(true);
    try {
      const reviewData: CreateReviewInput = {
        brand_user_id: currentUser.user.id,
        influencer_user_id: influencerId,
        rating,
        feedback: feedback.trim()
      };

      await trpc.createReview.mutate(reviewData);
      
      // Reset form
      setRating(0);
      setFeedback('');
      setShowReviewForm(false);
      
      // Reload reviews
      loadReviews();
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc: number, review: ReviewWithBrandInfo) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review: ReviewWithBrandInfo) => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate && onRate(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= (interactive ? (hoveredRating || rating) : rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const canLeaveReview = currentUser && 
    currentUser.user.user_type === 'brand' && 
    !reviews.some((review: ReviewWithBrandInfo) => review.brand_user_id === currentUser.user.id) &&
    !isViewOnly;

  const averageRating = calculateAverageRating();
  const ratingDistribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      {reviews.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-sm text-gray-600">
                  Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Rating distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-6">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 rounded-full h-2 transition-all duration-300"
                        style={{
                          width: reviews.length > 0 
                            ? `${(ratingDistribution[rating as keyof typeof ratingDistribution] / reviews.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">
                      {ratingDistribution[rating as keyof typeof ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Review Button */}
      {canLeaveReview && (
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Star className="h-4 w-4 mr-2" />
              Leave a Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave a Review</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating *
                </label>
                {renderStars(rating, true, setRating)}
                {rating === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Click a star to rate</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback *
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                  placeholder="Share your experience working with this influencer..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!rating || !feedback.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No reviews yet</p>
            {canLeaveReview && (
              <p className="text-xs text-gray-500 mt-1">
                Be the first to leave a review!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Reviews ({reviews.length})
            </h3>
            
            {reviews.map((review: ReviewWithBrandInfo) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={review.brand_logo_url || ''} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium">
                        <Building className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {review.brand_company_name}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderStars(review.rating)}
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              Brand
                            </Badge>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed">
                        {review.feedback}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <button className="flex items-center space-x-1 hover:text-gray-700 transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                          <span>Helpful</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-gray-700 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}