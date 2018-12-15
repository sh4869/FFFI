#include "opencv2/opencv.hpp"
#include "opencv2/imgproc.hpp"
#include "opencv2/imgcodecs.hpp"
#include "opencv2/highgui.hpp"

int main(int, char**)
{
  cv::VideoCapture cap(0);
  if (!cap.isOpened()) return -1;
  cv::Mat frame, blur, hsv, div, out;
  cv::namedWindow("edges", 1);
  for (;;)
  {
    cap >> frame;;
    cv::blur(frame, blur, cv::Size(10, 10));
    cv::cvtColor(blur, hsv, cv::COLOR_BGR2HSV);
    cv::inRange(hsv, cv::Scalar(70, 100, 30), cv::Scalar(120, 255, 200), div);
    cv::erode(div, out, cv::Mat(), cv::Point(-1, -1), 1);
    cv::Moments mu = cv::moments(out);
    cv::Point2f mc = cv::Point2f(mu.m10 / mu.m00, mu.m01 / mu.m00);
    cv::circle(out, mc, 4, cv::Scalar(100), 2, 4);
    imshow("edges", out);
    if (cv::waitKey(30) >= 0) break;
  }
  return 0;
}