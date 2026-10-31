using System;
using System.Collections.Generic;
using System.Text;
using System.Windows.Forms;
using System.Drawing;

/* FireBox
 * Version 2
 * Steve Kollmansberger
 */

    class FireBox : PictureBox
    {

        // maintain the 2-d array of values
        private Color[,] _box;

        // set the 2-d array of values via a property
        public Color[,] Background
        {
            set
            {
                _box = value;
                // note that once set we must
                // refresh the display
                Refresh();
            }
        }

        public bool BoxBorder { get; set; }
        
        // can also have an image on top
        // of the background
        private Image[,] _imgs;

        public Image[,] Images
        {
            set
            {
                _imgs = value;
                // note that once set we must
                // refresh the display
                Refresh();
            }
        }

        public FireBox()
        {
            // set a paint event to show the array
            this.Paint += new PaintEventHandler(FireBox_Paint);

            // allow user to click any box
            this.MouseClick += new MouseEventHandler(FireBox_MouseClick);

            // These two don't take effect 
            // if added in designer

            // default: nothing!
            Background = new Color[0, 0];

            // borders yes
            BoxBorder = true;
        }

        public class BoxClickEventArgs
        {
            public int x;
            public int y;
        }

        public delegate void BoxClickEventHandler(object sender, BoxClickEventArgs e);

        public event BoxClickEventHandler BoxClickEvent;


        void FireBox_MouseClick(object sender, MouseEventArgs e)
        {
            // determine which box was clicked
            int bwid = this.Width / _box.GetLength(0);
            int bhei = this.Height / _box.GetLength(1);

            int bx = e.X / bwid;
            int by = e.Y / bhei;

            if (BoxClickEvent != null)
                BoxClickEvent(this, new BoxClickEventArgs() { x = bx, y = by });

        }

        public float BoxSize
        {
            get
            {
                float bwid = (float)this.Width / (float)_box.GetLength(0);
                float bhei = (float)this.Height / (float)_box.GetLength(1);
                return Math.Max(bwid, bhei);
            }
        }

        void FireBox_Paint(object sender, PaintEventArgs e)
        {
            // don't paint if nothing
            if (_box.GetLength(0) == 0) return;

            // the width and height of each box
            // is the total space divided by
            // the number of boxes on that edge
            float bwid = (float)this.Width / (float)_box.GetLength(0);
            float bhei = (float)this.Height / (float)_box.GetLength(1);

            // for each box
            for (int x = 0; x < _box.GetLength(0); x++)
                for (int y = 0; y < _box.GetLength(1); y++)
                {
                    // fill it in its color
                    e.Graphics.FillRectangle(new SolidBrush(_box[x,y]),
                        x * bwid, y * bhei, bwid, bhei);

                    // paint the image on top, if needed
                    if (x < _imgs.GetLength(0) && y < _imgs.GetLength(1) &&
                        _imgs[x,y] != null)
                    {
                        e.Graphics.DrawImage(_imgs[x,y], x * bwid, y * bhei, bwid, bhei);
                    }

                    // then draw a black outline around it
                    // if desired
                    if (BoxBorder)
                    {
                        e.Graphics.DrawRectangle(Pens.Black, x * bwid,
                            y * bhei, bwid, bhei);
                    }
                    
                }


        }
    }

