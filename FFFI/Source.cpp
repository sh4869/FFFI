#include "opencv2/opencv.hpp"
#include "opencv2/imgproc.hpp"
#include "opencv2/imgcodecs.hpp"
#include "opencv2/highgui.hpp"

int main(int, char**)
{
  cv::VideoCapture cap(0);
  if (!cap.isOpened()) return -1;
  cv::Mat frame, blur, hsv, div, out;

  const int waveLength = 150;
  cv::Mat wave(cv::Size(waveLength, 1), CV_32F, cv::Scalar::all(0)), blurredWave;

  cv::namedWindow("wave", 1);
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

    //wave全体をシフト
    for (int i = 0; i < waveLength - 1; i++) {
      wave.at<float>(i) = wave.at<float>(i + 1);
    }

    //最新の値をwave[waveLength-1]に格納 NaNなら1つ前の値
    const float waveValue = mc.y / frame.rows;
    wave.at<float>(waveLength - 1) = isnan(waveValue) ? wave.at<float>(waveLength - 2) : waveValue;

    //waveを平滑化
    cv::blur(wave, blurredWave, cv::Size(3, 1));

    //グラフを描画
    for (int i = 1; i < waveLength; i++) {
      const cv::Point pt1 = cv::Point(frame.cols / waveLength * (i - 1), frame.rows * blurredWave.at<float>(i - 1));
      const cv::Point pt2 = cv::Point(frame.cols / waveLength * i, frame.rows * blurredWave.at<float>(i));
      const bool isUp = blurredWave.at<float>(i) < blurredWave.at<float>(i - 1);
      const cv::Scalar color = isUp ? CV_RGB(255, 0, 0) : CV_RGB(0, 0, 255);
      cv::line(frame, pt1, pt2, color, 1, CV_AA);
    }
    imshow("wave", frame);

    if (cv::waitKey(30) >= 0) break;
  }
  return 0;
}